const path = require('path');
const express = require('express');
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require('morgan');
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorController')
const tourRouter = require('./routes/tourRoute')
const userRouter = require('./routes/userRoute')
const reviewRouter = require('./routes/reviewRoute')
const viewRouter = require('./routes/viewRoute')
const app = express();



app.set('view engine', 'pug');
app.set('views', path.join(__dirname,'views'))









app.use(express.static(`${__dirname}/public`));

// 1) GLOBAL MIDDLEWARES
// SECURITY HTTP headers

app.use(helmet())
app.use(cors())



app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' https://unpkg.com blob:; worker-src 'self' blob:;",
  );
  next();
});

//developement logging
console.log(process.env.NODE_ENV)
if (process.env.NODE_ENV === "development") {
  app.use(morgan('dev'));
}


// BruteForce limiting, limiting requests per IP adresse
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP , try again later' 
  })
  app.use('/api',limiter)




//Body parser , reading data from body into req.body, we can pass an object argument to limit body size
app.use(express.json({  limit:'10kb' }));
app.use(cookieParser())

//Data sanitization againt NoSQL query injection 
app.use(mongoSanitize()) // this function filters $ and '' to disable injections



//Data sanitization against XSS
app.use(xss())

//Prevent parameter pollution , whitelist params to allow duplication on them
app.use(hpp({
  whitelist: [
    'duration',
    'ratingAverage',
    'maxGroupSize',
    'difficulty',
    'price',
    'ratingsAverage'
  ]
}))

//serving static files
app.use(express.static(`${__dirname}/public`))

//test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies)
  next();
})



//we use the version in the route to not block users while changing veersions
//ROUTES


app.use('/', viewRouter)
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)


//handle error request for not found routes , this code should be implemented at the end after handling found routes
app.all('*',(req, res, next) =>{
  next(new AppError(`can't find ${req.originalUrl} on this server`,400)) // if sthg is passed to next() in an error case the middleware stack is aborted 
})


app.use(globalErrorHandler) // handles not found routes



module.exports = app;

//START SERVER
