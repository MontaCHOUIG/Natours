const mongoose = require('mongoose')
const slugify = require('slugify')
const validator = require('validator')
// const User = require('./userModel')

const tourSchema = new mongoose.Schema({  //creating a schema for data objects 
  name:{
    type: String,
    required: [true,'A tour must have a name'],
    unique: true,
    maxlength: [40, 'Atour name must have less or rqual then 40 chars'],
    minlength: [10, 'Atour name must have less or rqual then 40 chars'],
    // validator: [validator.isAlpha,'Tour name must only contain characters']
    

  },
  slug: {
    type: String
  },
  duration: {
    type: Number,
    required: [true,'A tour must have a duration']

  },
  maxGroupSize: {
    type: Number,
    required: [true,'A tour must have a group size']

  },
  difficulty:{
    type: String,
    required: [true,'A tour must have a difficulty'],
    enum: {
      values: ['easy','medium','difficult'],
      message: 'difficulty must be easy , hard or difficult'
    }
  },
  ratingAverage:{
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be under or equal 5.0'],
    set: val => Math.round(val * 10) / 10

  },
  ratingQuantity:{
    type: Number,
    default: 0,
  },
  price:{
    type: Number,
    required: [true,'A tour must have a price']

  },
  discount: {
    type: Number,
    validate: // custom VALIDATOR
    {
      
      validator :
      function(val){   //  VAL is the value of discount provided to the document and using a normal function to have access to this. (the document under review) and this only points to current doc or a NEW doc creation
      return val < this.price
      },
      message: 'Discount price ({VALUE}) should be below the regular price',

     
    }
  },
  summary: {
    type: String,
    trim: true ,  // removes spaces from string
    required: [true, 'a tour must have summary']
  },
  description: {
    type: String,
    trim: true ,  // removes spaces from string
    required: [true, 'a tour must have description']
  },
  imageCover:{
    type: String,
    required: [true, ' a tour must have a cover image']
  },
  images:[String],
  createdAt:{
    type: Date,
    default: Date.now()
  },
  startDates: [Date],
  secretTour:{
    type: Boolean,
  
  },
  startLocation: {
   //GeoJSON
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number],
    address: String,
    description: String
    
  },
  locations: [
    {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates:[Number],
      address: String,
      description: String,
      day: Number
    }
  ],
  guides: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  ]
},
 {
  toJSON: { virtuals : true},
  toObject: {virtuals: true}
},
)



//indexs , sort the documents by a certain field , 1:ascending , -1:descending
// tourSchema.index({price:1})
//compound index:
tourSchema.index({price:1, ratingAverage: -1})
tourSchema.index({slug: 1})
tourSchema.index({ startLocation: '2dsphere'})



// Virtual populate , allow parent refrencing without storing an array of ids in the DB
tourSchema.virtual('durationWeeks').get(function(){
  return this.duration/7  //we used a regular function to have access to this. for documents
})

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
})


//DOCUMENT MIDDLEWARE , it runs before .save() and .create()
tourSchema.pre('save', function(next){
  this.slug = slugify(this.name, {lower: true})
  next();
})


// //EMBedding Tour guides (users into tours)
// tourSchema.pre('save', async function(next){
//   const guidesPromises = this.guides.map(async id => await User.findById(id))
//   this.guides = await Promise.all(guidesPromises)
// })

// tourSchema.pre('save', function(next){
//   console.log('will save doc soon ...')
//   next();
// })


// tourSchema.post('save', function(doc, next){
//   console.log(doc)
//   next()
// })


// QUERY MIDDLEWARE , it runs before the actual query , hiding secret tours



tourSchema.pre(/^find/, function(next){ // it works with every query that begins with find
  this.find({secretTour: {$ne: true}})

  
  next()

})


// populate looks for ids of guides in tour model , it creates a query to look for guides by their ids
tourSchema.pre(/^find/, function(next){
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  })
  next()
})


// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function(next) {
  // Hide secret tours if geoNear is NOT used
  if (!(this.pipeline().length > 0 && '$geoNear' in this.pipeline()[0])) {
    this.pipeline().unshift({
      $match: { secretTour: { $ne: true } }
    });
  }
  next();
});
const Tour = mongoose.model('Tour' , tourSchema) // creating a Model 

module.exports = Tour

