const axios = require('axios');
const fs = require('fs');
const apiUrl = 'https://api.smartnode.in/api/v1/singleRemote';
const csv = require('./csv-parser');

async function getcode(brand , remoteNo){
    let brand_id = brand.toUpperCase();
    let min_temp=24;
    let max_temp=24;
    let fan_step;
    brand_id = brand_id.replace(/ /g, '');

/*    if (fs.existsSync(brand_id+'_'+remoteNo+'.csv')) {

      fs.createReadStream(brand_id+'_'+remoteNo+'.csv')
      .pipe(csv())
      .on('data', (row) => {
        try {
          min_temp = (parseInt(row.temperature) < min_temp) ? parseInt(ac_[0]) : min_temp;
          max_temp = (parseInt(row.temperature) > max_temp) ? parseInt(ac_[0]) : max_temp;
        } catch (e) {

        }
            })
      .on('end', () => {
      });
    }
*/
    const jsonData = {
        modelNumber: remoteNo,
        remoteType: 'SAC',
        companyName:brand,
        companyId: brand_id
    };
    // Make a POST request
    await axios.post(apiUrl, jsonData,{
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => {
            const responseData = response.data.singleRemote[0].data;
            var filePath = brand_id+'_'+remoteNo+'.csv'
            fs.writeFileSync(filePath, 'temperature,fanspeed,swing,frequency,unique_cycle,code\n');
            for(var i=0; i<responseData.length; i++){
                if(responseData[i].protocol == "RAW"){
                    var ac_ = responseData[i].acData.split(",");
                    var fan_ = ["L", "M", "H", "A"];
                    var swg_ = ["F","A"];
                    min_temp = (parseInt(ac_[0]) < min_temp) ? parseInt(ac_[0]) : min_temp;
                    max_temp = (parseInt(ac_[0]) > max_temp) ? parseInt(ac_[0]) : max_temp;
                    try{
                    var data = ac_[0]+","+(25*(1+parseInt(fan_.indexOf(ac_[3])))).toString()+","+swg_.indexOf(ac_[2])+","+responseData[i].frequency+',"'+responseData[i].uniqueCycle+'","'+responseData[i].code+'"'+'\n';
                    fs.appendFileSync(filePath, data, (err) => {
                      if (err) {
                        console.error('Error appending to file:', err);
                      } else {
                        console.log('Data appended to file successfully.');
                      }
                    });
                    } catch(e){
                        console.log('error writing to file');
                    }
                  }
            }
            console.log('Data written to .csv successfully.');
            console.log(min_temp, max_temp);
        }).catch(error => {
            console.error('Error making POST request:', error.message);
        });

        return [min_temp, max_temp, brand_id];
}


module.exports = { getcode };