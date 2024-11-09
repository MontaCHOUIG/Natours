const Tour = require('../models/tourModel')
const catchAsync = require('../utils/catchAsync')


exports.getOverview = catchAsync(async (req,res,next)=> {

  //1) gET tour data from collection
  const tours = await Tour.find()


  //2) build template


  //3)Render the template using tour data
  res.status(200).render('overview' ,{
    title: 'All tours',
    tours
  })
}) 


exports.getTour = catchAsync(async (req,res ,next)=> {

  // 1) Get the data , for the  requested tour (quides , reviews)
  const tour = await Tour.findOne({slug: req.params.slug}).populate({
    path: 'reviews',
    fields: 'review rating user'
  })

  //2) build template



  res.status(200).render('tour' ,{
    title: `${tour.name} Tour`,
    tour
  })
})


exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  })
}