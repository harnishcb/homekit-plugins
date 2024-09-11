function arraycount(array,num){
 var target=0;
 for(var i=0;i<=num;i++){
   if(array[i] == 'empty'){
    target = target+1;
    }
  }
  return target;
}

module.exports = { arraycount };
