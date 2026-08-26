<?php
$memberId = "4f66xxxxxae579616a2";   //商户ID
$applyDate = date("Y-m-d H:i:s");  //提交时间


//请求签名参数
$native = array(
    "memberId" => $memberId,
    "applyDate" => $applyDate
);
ksort($native); //注意，一定要排序
$md5str = "";
foreach ($native as $key => $val) {
    $md5str = $md5str . $key . "=" . $val . "&";
}

//echo($md5str . "key=" . $Md5key);
$sign = strtoupper(md5($md5str . "key=" . $Md5key));
$native["sign"] = $sign;

//转成json
$data_string =  json_encode($native);

//curl提交
$ch = curl_init("http://localhost/Payment_Balance_add.html");//提交地址
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS,$data_string);
curl_setopt($ch, CURLOPT_RETURNTRANSFER,true);
// 关闭SSL验证
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Content-Length: ' . strlen($data_string)
));

$result = curl_exec($ch);
if (curl_errno($ch)) {
    print curl_error($ch);
}
curl_close($ch);
echo $result;

$obj=json_decode($result,TRUE);

$signUP=$obj['pay_md5sign'];

//移除返回的签名
unset($obj['pay_md5sign']);

ksort($obj);
$md5str = "";
foreach ($obj as $key => $val) {
    $md5str = $md5str . $key . "=" . $val . "&";
}
//echo($md5str . "key=" . $Md5key);
$sign = strtoupper(md5($md5str . "key=" . $Md5key));

//验证签名是否一致
if ($sign!= $signUP) exit('error:sign');

?>
