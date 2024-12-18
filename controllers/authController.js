const {promisify} = require('util')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const jwt = require('jsonwebtoken')
const AppError = require('./../utils/appError')
const sendEmail = require('./../utils/email')
const crypto = require('crypto')


const signToken = id => {
  return jwt.sign({id}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION_PERIOD
  })
}


const createSendToken = (user,statusCode,res) => {

  const token = signToken(user._id)
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000), 
    httpOnly:true 
  }

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true   // https
  
  
  res.cookie('jwt', token, cookieOptions)
  user.password = undefined // remove pass from output
 
  res.status(statusCode).json({
    message:'success',
    token,
    data:{
      user
    }
  })

}


exports.signup = catchAsync( async (req,res,next) => {
  
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role
  })

  

  createSendToken(newUser,200,res)

})

exports.login = catchAsync(async (req,res,next) => {
  const {email, password} = req.body

  //1) Check if email and password exist
  if(!email || !password){
    return next(new AppError('Please provide email and password !! ', 400))
  }

  //2) Check if user exists && password is correct

  const user = await User.findOne({email}).select('+password') // add the + to neglect the select:false param

  if(!user || !(await user.correctPassword(password, user.password))){
    return next(new AppError('Incorrect email and password', 401))
  }


  //3) if everything ok , send token
  createSendToken(user,200,res)
})

exports.protect = catchAsync(async (req,res,next) => {
  //1) Getting token and check if it exists
  let token;
  
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies.jwt){
    token = req.cookies.jwt
  }
  
  if(!token){
    return next(new AppError('You are not logged in please log in to get access !!!',401))
  }
  //2) Verification token , making sure that the token payload wasnt manipulated 

  const decoded = await promisify(jwt.verify)(token,process.env.JWT_SECRET)
  console.log(decoded)

  //3) check if user still exists

  const currentUser = await User.findById(decoded.id)
  if(!currentUser){
    return next(new AppError('The user belonging to the token does no longer exist', 401))
  }


  //4) Check if user changed password after the JWT was issued

 if (currentUser.changedPasswordAfter(decoded.iat)){
  return next(new AppError('User recently changed password! please login again'))
 }


  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser
  next();
})

// Only for rendered pages , no errors

exports.isLoggedIn = catchAsync(async (req,res,next) => {
   
   if (req.cookies.jwt){
      //1) Verification token , making sure that the token payload wasnt manipulated 
      const decoded = await promisify(jwt.verify)(req.cookies.jwt,process.env.JWT_SECRET)
      console.log(decoded)

      //2) check if user still exists
      const currentUser = await User.findById(decoded.id)
      if(!currentUser){
        return next()
      }
      //3) Check if user changed password after the JWT was issued
    if (currentUser.changedPasswordAfter(decoded.iat)){
      return next()
    }


      //There is a logged in user // templates have access to req.locals
      res.locals.user = currentUser
      return next();
}
  next()
})


// we cannot pass arguments to middleware functions , so the solution is to wrap our middleware function like this example
//roles is an array
// req.user is stored from the protect() function that runs before this one
exports.restrictTo = (...roles) => {
  return (req,res,next) => {
    if(!roles.includes(req.user.role)){
      return next(new AppError('you do not have permission to perform this action!', 403))
    }
    next()
  }

}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req,res,next) => {
    //1) Get user based on the token
    const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

    const user = await User.findOne({passwordResetToken: hashedToken,
                                     passwordResetExpires: {$gte: Date.now()}})

    //2) If token has not expired , and there is user , set the new password
    
    if(!user){
      return next(new AppError('Token is invalid or has expired', 400))
    }

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save(); // we use .save to run validators on the new password

    //3)Update changedPasswordAt property for the user
    
    //4) Log the user in , send JWT
    createSendToken(user,200,res)

})

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});