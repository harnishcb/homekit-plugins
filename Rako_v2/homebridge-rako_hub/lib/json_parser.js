// String containing two JSON objects without delimiter

/*function parser(string){
    console.log('String received:', string);
    string = string.replace(/ /g, '');
    string = string.replace(/\n/g, '');
    console.log("Process stage-1", string);
    string = string.split('}{');
    if (string.length > 1){
        for (var i=0;i<string.length; i++){
            if (i==0){
                string[i] = string[i]+'}';
            }
            else if(i==string.length-1){
                string[i] = '{'+string[i];
            }
            else {
                string[i] = '{'+string[i]+'}';
            }
            try {
                console.log(JSON.parse(string[i]));
            } catch (e){
                console.log(e);
            };
        }
    } else {
        try {
            console.log(JSON.parse(string[0]));
        } catch (e){
            console.log(e);
        }

    }

    return string;
}
*/
module.exports = { parser };


function parser(string){
    console.log('String received:', string);
    var position = [];
    let neutral=0 ;
    for (var i=0;i<string.length;i++){
      if (string[i] == '{'){
        neutral++;
      }
      else if (string[i] == '}'){
        neutral--;
        if (neutral == 0){
            position.push(i);
        }
      }
    }
    console.log(position)
    let final = [];
    for (var i=0;i<position.length;i++){
        final.push(string.slice(Math.max(0,position[i-1]+1),position[i]+1));
    }
    console.log(final);
    return final;
}