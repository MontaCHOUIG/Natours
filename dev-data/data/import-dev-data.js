const dotenv = require('dotenv')
const fs = require('fs')
const Tour = require('./../../models/tourModel')
const User = require('./../../models/userModel')
const Review = require('./../../models/reviewModel')

const mongoose = require('mongoose')


// console.log(app.get('env'))


dotenv.config({ path: "./config.env" })


const DB = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD)

mongoose
    .connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
})
    .then(con => {
 // console.log(con.connections)
  console.log('DB connection successful')
})


//READ JSON FILE

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`,'utf-8'))
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`,'utf-8'))
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`,'utf-8'))


// IMPORT DATA FROM JSON TO DB

const importData = async() => {
  try{
    await Tour.create(tours)
    await User.create(users, {validateBeforeSave: false} )
    await Review.create(reviews)

    console.log("data loaded")
    process.exit()
  }
  catch(err){
  console.log(err)}
}


// DELETE ALL DATA FROM COLLECTION

const deleteData = async () => {
  try{
    await Tour.deleteMany()
    await User.deleteMany()
    await Review.deleteMany()
    console.log('data deleted')
    process.exit()

  }
  catch(err){
    console.log(err)
  }
}

if (process.argv[2] === '--import')
{
  importData()
}
if (process.argv[2] === '--delete')
{
  deleteData()
}


// process.argv IS AN ARRAY WHICH CONTAINS THE PROCESS ARGUMENTS  
// TO IMPORT RUN (node dev-data/data/import-dev-data --import)
// TO DELETE RUN (node dev-data/data/import-dev-data --delete)
