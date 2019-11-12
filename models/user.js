const mongoose=require('mongoose');

const bcrypt=require('bcrypt');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetPasswordToken: {
    type:String,
  },
  resetPasswordExpires:{
    type: Date
  }
});


userSchema.methods.hashPassword=function(password){

   return bcrypt.hashSync(passport,bcrypt.genSaltSync(10))


}



userSchema.methods.comparePassword=function(password,hash){
   return bcrypt.compareSync(passport,hash)

}


module.exports=mongoose.model('User',userSchema);
