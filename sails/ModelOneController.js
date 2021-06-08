module.exports = {

  // ==============================================================
  Create: CatchAsync(async (req, res) => {
    const { error, value } = Joi.object({
      name: Joi.string().required(),
      family: Joi.string().required(),
      phone: Joi.string().required(),
      password: Joi.string().required(),
      city: Joi.number(),
      isActive: Joi.boolean().default(true),
      isHead: Joi.boolean().default(false),
      canBuildHead: Joi.boolean(),
    }).validate(req.body);
    if (error) throw new AppError(error, -1, 500);

    // validate phone an converted to standard format
    const standardPhone = sails.helpers.phoneValidation(value.phone);
    if (standardPhone.error) throw new AppError(standardPhone.error, -1, -500);

    const adminID = req.session.modelOne.id;
    const isHead = req.session.modelOne.is_head;

    value.parentID = adminID;

    if (adminID === 0) !value.canBuildHead && (value.canBuildHead = false);
    else value.canBuildHead = false;

    // if admin wasn't a head , she can not build a modelOne
    if (!isHead) throw new AppError("you cant build a modelOne");

    const result = await ModelOne.create(value);
    if (!result) throw new AppError("problem in creating modelOne", -5, 500);

    return res.success(200, "modelOne created successfully");
  }),

  // ======================================================================

  logIn: CatchAsync(async (req, res) => {
    const { error, value } = Joi.object({
      token: Joi.string().required(),
      phone: Joi.string().required(),
      pass: Joi.string().required(),
    }).validate(req.body);
    if (error) throw new AppError(error, -1, 500);

    const captchaResult = await sails.helpers.recaptcha(value.token);
    if (!captchaResult) return res.error(500, -16, "recaptcha error");

    // convert phone to standard format
    const standardPhone = sails.helpers.phoneValidation(value.phone);
    if (standardPhone.error) throw new AppError(standardPhone.error, -2, 500);

    let modelOne = await ModelOne.getDatastore().sendNativeQuery(
      "select * from model_one where phone= $1",
      [standardPhone]
    );
    if (modelOne.rowCount === 0)
      throw new AppError(
        "could not find a  modelOne with this phoneNumber",
        -2,
        500
      );
    modelOne = modelOne.rows[0];
    const modelOneHashedPassword = modelOne.pass;

    const access = await bcrypt.compare(value.pass, modelOneHashedPassword);

    if (access) {
      req.session.modelOne = modelOne;
      req.session.modelOne.pass = false;
      req.session.authenticated = true;

      delete modelOne.pass;

      return res.success(200, {
        id: modelOne.id,
        name: modelOne.name,
        family: modelOne.family,
        balance: modelOne.balance,
        isHead: modelOne.is_head,
        creator: modelOne.can_build_head,
      });
    }

    return res.error(500, -6, "password or phone is not currect");
  }),

  // ======================================================================

  logOut: CatchAsync(async (req, res) => {
    req.session.modelOne = undefined;
    req.session.authenticated = false;

    return res.success(200, "you loged out successfully");
  }),

  // ======================================================================

  update: CatchAsync(async (req, res) => {
    const { error, value } = Joi.object({
      id: Joi.number().integer().min(0).required(),
      name: Joi.string(),
      family: Joi.string(),
    }).validate(req.body);
    if (error) throw new AppError(error, -1, 500);

    const { id } = req.session.modelOne;

    // a modelOne can edit himself or his childs (appket can edit every body)
    if (value.id !== id && id !== 0) {
      let modelOne = await ModelOne.search({ id: value.id });
      if (!modelOne)
        throw new AppError("could not find a modelOne with this id", -2, 500);
      modelOne = modelOne[0];
      if (modelOne.parent_id !== id)
        throw new AppError("you cand edit this modelOne.");
    }

    const updateResult = await modelOne.updatemodelOne(value.id, value);

    if (!updateResult)
      throw new AppError("problem in updating modelOne", -2, 500);
    return res.success(200, "modelOne updated successfully");
  }),

  // ======================================================================
  changemodelOnePassword: CatchAsync(async (req, res) => {
    const { error, value } = Joi.object({
      modelOneID: Joi.number().integer().min(0).required(),
      authPassword: Joi.string().required(),
      newPassword: Joi.string().required(),
    }).validate(req.body);
    if (error) throw new AppError(error, -1, 500);

    const adminID = req.session.modelOne.id;

    // a modelOne can edit himself or his childs (appket can edit every body)
    if (value.modelOneID !== adminID && adminID !== 0) {
      let modelOne = await modelOne.search({ id: value.modelOneID });
      if (!modelOne)
        throw new AppError("could not find a modelOne with this id", -2, 500);
      modelOne = modelOne[0];
      if (modelOne.parent_id !== adminID)
        throw new AppError("you cand edit this modelOne.");
    }

    // check if auth password is true
    const authority = await modelOne.getDatastore().sendNativeQuery(
      `select pass from modelOne where id=$1`,
      [adminID]
    );
    if (authority.rowCount === 0)
      throw new AppError("problem in changing password");
    if (!(await bcrypt.compare(value.authPassword, authority.rows[0].pass)))
      throw new AppError("password is not correct", -6, 500);

    // ---------- update password -----------------------------------------------------
    const result = await modelOne.changemodelOnePassword(
      value.modelOneID,
      value.newPassword
    );
    if (!result) throw new AppError("error changeing password", -2, 500);
    return res.success(200, "password change successfully");
  }),

  // ==========================================================
  /**
   * update modelOne active status
   */
  changeActiveStatus: CatchAsync(async (req, res) => {
    const { error, value } = Joi.object({
      id: Joi.number().integer().min(0).required(),
      status: Joi.boolean().required(),
    }).validate(req.body);
    if (error) throw new AppError(error, -1, 500);

    if (!req.session.modelOne.is_head)
      throw new AppError(
        "you do not have authority to perform this action",
        -6,
        500
      );

    const parentID = req.session.modelOne?.parent_id;

    const result = await modelOne.switchActive(
      value.id,
      value.status,
      parentID
    );

    if (!result)
      throw new AppError("problem in updating modelOne active status", -2, 500);

    return res.success(200, "status update successfully");
  }),

  // ===================================================================
  search: CatchAsync(async (req, res) => {
    const { error, value } = Joi.object({
      id: Joi.number().min(0),
      name: Joi.string(),
      family: Joi.string(),
      phone: Joi.string(),
      city: Joi.number(),
      isActive: Joi.boolean(),
      isHead: Joi.boolean(),
      skip: Joi.number().integer().min(0),
      limit: Joi.number(),
    }).validate(req.body);
    if (error) throw new AppError(error, -1, 500);

    const filters = value;
    const { modelOne } = req.session;

    // set parent id so heads just can edit their modelOnes or modelOnes can edit them selves
    if (filters.id !== modelOne.id) filters.parentID = modelOne.id || undefined;

    const result = await modelOne.search(filters);
    if (!result) throw new AppError("problem in getting modelOnes", -2, 500);

    return res.success(200, result);
  }),


  getmodelOneMainPageData: CatchAsync(async (req, res) => {
    const { error, value } = Joi.object({
      startDate: Joi.number().integer().min(0),
      endDate: Joi.number().integer().min(0),
    }).validate(req.body);
    if (error) throw new AppError(error, -1, 500);
    const { modelOne } = req.session;

    const result = await modelOne.getmodelOneMainPageData(
      modelOne?.id,
      value.startDate,
      value.endDate
    );
    if (!result)
      throw new AppError("problem in getting modelOne mainPage data", -5, 500);
    return res.success(200, result);
  }),

};

const phoneValidator = (value, helpers) => {
  const result = sails.helpers.phoneValidation(value);

  if (result.error) throw new Error(result.error);
  return result;
};
