const concatenatedJsonString = '{"name":"tracker","type":"level","payload":{"roomId":6,"channelId":9,"currentLevel":251,"targetLevel":54,"timeToTake":1229,"temporary":false}}{"name":"tracker","type":"level","payload":{"roomId":6,"channelId":10,"currentLevel":251,"targetLevel":191,"timeToTake":374,"temporary":false}}{"name":"tracker","type":"level","payload":{"roomId":6,"channelId":11,"currentLevel":251,"targetLevel":191,"timeToTake":374,"temporary":false}}{"name":"tracker","type":"level","payload":{"roomId":6,"channelId":12,"currentLevel":251,"targetLevel":191,"timeToTake":374,"temporary":false}}{"name":"tracker","type":"level","payload":{"roomId":6,"channelId":13,"currentLevel":251,"targetLevel":191,"timeToTake":374,"temporary":false}}';

// Find the index where the second JSON object starts
let currentIndex = 0;
let jsonStringArray = [];
let index = [0];

function string_slit(concatenatedJsonString){
let open_curly = 0;
let close_curly = 0;
let neutral_state = 0;
for (var i=0;i<concatenatedJsonString.length;i++){
    if (concatenatedJsonString[i] == '{'){
        open_curly++;
        neutral_state++;
        console.log(neutral_state);
    } else if (concatenatedJsonString[i] == '}'){
        close_curly++;
        neutral_state--;
        console.log(neutral_state);
  
        if(neutral_state == 0){
            index.push(i);
        }
    }
}
indivisual_str(concatenatedJsonString)
}

function indivisual_str(concatenatedJsonString){
    for(var i=0;i<index.length-1;i++){
        jsonStringArray.push(concatenatedJsonString.slice(index[i], index[i+1]+1));
    }
jsonStringArray.push()
}

string_slit(concatenatedJsonString);
console.log('JSON Strings:', index, jsonStringArray);
