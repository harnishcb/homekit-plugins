function data_process(data){
  //console.log("Incoming Data", data);
  var len = data.length;
  //console.log("Data Length", len);
  var final_value;
  switch(len){
    case 1:
       final_value = data[0];
    break;
    case 2:
       data = data[0].toString(16) + data[1].toString(16); 
       final_value = parseInt(data,16);
    break;   
  }
  return final_value;
}


module.exports = { data_process }
