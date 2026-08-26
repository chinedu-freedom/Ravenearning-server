<?php
$payMemberId = "4f66xxxxxae579616a2";   //商户ID
$payOrderId = 'E'.date("YmdHis").rand(100000,999999);    //订单号
$payAmount = "100.01";    //交易金额
$payApplyDate = date("Y-m-d H:i:s");  //订单时间
$payChannelCode = "8001";    //通道编码
$payNotifyUrl = "http://www.yourdomain.com/demo/server.php";   //服务端返回地址
$Md5key = "f2fcfbxxxxb94c24f93";   //密钥

//请求签名参数
$native = array(
    "payMemberId" => $payMemberId,
    "payOrderId" => $payOrderId,
    "payAmount" => $payAmount,
    "payApplyDate" => $payApplyDate,
    "payChannelCode" => $payChannelCode,
    "payNotifyUrl" => $payNotifyUrl
);
ksort($native); //注意，一定要排序
$md5str = "";
foreach ($native as $key => $val) {
    $md5str = $md5str . $key . "=" . $val . "&";
}
//echo($md5str . "key=" . $Md5key);
$sign = strtoupper(md5($md5str . "key=" . $Md5key));
$native["sign"] = $sign;

// 可选参数
// $native["payCallbackUrl"] = "http://baidu.com/id=111"; // 商户前端页面支付成功后跳转通知地址

//转成json
$data_string =  json_encode($native);

//curl提交
$ch = curl_init("http://localhost:8080/api/pay/createPay");//提交地址
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

?>
