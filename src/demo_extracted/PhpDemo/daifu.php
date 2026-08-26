<?php
$drawMemberId = "4f66xxxxxae579616a2";   //商户号
$drawOrderId = 'E'.date("YmdHis").rand(100000,999999);    //订单号
$drawAmount = "100.01";    //金额 单位：元
$drawPayNow = "1";    //跨行是否立即支付 0：否 1：是
$drawBankName = "Nedbank";    // 开户行名称 参考《代付支持银行》，严格对应支持的银行编码。
$drawCardNumber = "13888888888";    //银行卡号
$drawAccountName = "张三";    //银行卡户名
$drawNotifyUrl = "http://localhost:8888/dfasynchronous";   //异步通知回调URL地址
$Md5key = "f2fcfbxxxxb94c24f93";   //密钥

//代付参数
$native = array(
	"drawMemberId" => $drawMemberId,
	"drawOrderId" => $drawOrderId,
	"drawAmount" => $drawAmount,
	"drawPayNow" => $drawPayNow,
	"drawBankName" => $drawBankName,
	"drawCardNumber" => $drawCardNumber,
	"drawAccountName" => $drawAccountName,
	"drawNotifyUrl" => $drawNotifyUrl
);

ksort($native);//排序
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
$ch = curl_init("http://localhost:8080/api/pay/createDraw");//提交地址
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
