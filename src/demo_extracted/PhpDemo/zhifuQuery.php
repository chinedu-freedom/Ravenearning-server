<?php
$payMemberId = "4f66xxxxxae579616a2";   //商户ID
$payOrderId = 'E'.date("YmdHis").rand(100000,999999);    //订单号
$Md5key = "f2fcfbxxxxb94c24f93";   //密钥

//订单查询
$native = array(
    "payMemberId" => $payMemberId,
    "payOrderId" => $payOrderId,
);
ksort($native);
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
$ch = curl_init("http://localhost:8080/api/pay/queryPay");//提交地址
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

$signUP=$obj['sign'];

//移除返回的签名
unset($obj['sign']);

ksort($obj);
$md5str = "";
foreach ($obj as $key => $val) {
    $md5str = $md5str . $key . "=" . $val . "&";
}
//echo($md5str . "key=" . $Md5key);
$sign = strtoupper(md5($md5str . "key=" . $Md5key));

//验证签名是否一致,状态成功后开始处理上分
if ($sign!= $signUP) exit('error:sign');

?>
