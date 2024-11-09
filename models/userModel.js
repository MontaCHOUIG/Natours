const crypto = require('crypto')
const mongoose = require('mongoose')

const validator = require('validator')
const bcrypt = require('bcryptjs')
const catchAsync = require('./../utils/catchAsync')

// name , email , photo , password , passwordConfirm


const userSchema = new mongoose.Schema({
  name:{
    type: String,
    required: [true, "please provide your name! "],
    validator: [validator.isAlpha,'Tour name must only contain characters']
  },
  email:{
    type: String,
    required: [true, 'please provide your email! '],
    unique: true,
    lowercase: true,
    validate:[validator.isEmail, 'please provide a valid email !']

  },
  photo:{
    type: String,
    default: "defaultUser.png"
  },
  role:{
    type: String,
    enum: ['user', 'guide','lead-guide', 'admin'],
    default:'user'
  },
  password:{
    type: String,
    required: true,
    minlength:[6,'password must constain at least 6 characters'],
    unique: true,
    select: false
  },
  passwordConfirm:{
    type: String,
    required: [true, 'Please confirm your password'],
    //THIS ONLY WORKS ON .create and .save
    validate: {
      validator: function(el){
      return el === this.password 
    },
    message: "passwords are not the same !!"
    }
  },
  passwordChangedAt:{
    type:Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active:{
    type: Boolean,
    default: true,
    select: false
  }
})

userSchema.pre(/^find/, function(next){
  //this points to the current query
  this.find({active: {$ne: false}})
  next()
})

//Before saving the user in the DB we need to encrypt the password and delete the passwordconfirm
userSchema.pre('save', async function(next){
  // Only run this function if password was actually modified
  if(!this.isModified('password'))return next()
  //hash the password with cost of 12

  this.password = await bcrypt.hash(this.password, 12)
  //delete the duplicate
  this.passwordConfirm = undefined
  next()
})

userSchema.pre('save', function(next){
  if(!this.isModified('password')|| this.isNew) return next()
  
  this.passwordChangedAt = Date.now() - 1000
  next()  

})





userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
  return await bcrypt.compare(candidatePassword,userPassword)
}


userSchema.methods.changedPasswordAfter = function(JWTTimeStamp){
  let changedTimeStamp
  if(this.passwordChangedAt){
   changedTimeStamp = parseInt(this.passwordChangedAt.getTime()/1000 ,10)
    console.log(changedTimeStamp, JWTTimeStamp)
  }
  //False === not changed
  return JWTTimeStamp < changedTimeStamp
}

userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex')
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
  
    console.log({resetToken}, this.passwordResetToken)

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    return resetToken
  
  }



const User = mongoose.model('User', userSchema)

module.exports = User