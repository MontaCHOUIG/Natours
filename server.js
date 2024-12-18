const dotenv = require('dotenv')
const mongoose = require('mongoose')




process.on('uncaughtException', err => {
  console.log(err.name, err.message)
  console.log('UNCAUGHT EXCEPTION , shutting down')
 
  process.exit(1)
})


dotenv.config({ path: "./config.env" })

const app = require('./app')

// console.log(app.get('env'))


const DB = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD)

mongoose
    .connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true
})
    .then(con => {
  //console.log(con.connections)
  console.log('DB connection successful')})

    





//console.log(process.env)
const port = 3000 || process.env.PORT
const server = app.listen(port, () => {
  console.log(` app running on port ${port}`)
})

process.on('unhandledRejection', err => {
  console.log(err.name, err.message)
  console.log('UNHANDLED REJECTION , shutting down')
  server.close(() => {
    process.exit(1)
  })
  
})


