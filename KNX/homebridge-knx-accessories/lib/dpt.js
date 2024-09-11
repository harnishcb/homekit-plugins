
function convert_dpt9(data){
    sign = (data & 0x8000) >> 15
    exp = (data & 0x7800) >> 11
    mant = data & 0x07ff
    var value = (1 << exp) * 0.01 * mant;
    return value;
}


module.exports =  { convert_dpt9 };