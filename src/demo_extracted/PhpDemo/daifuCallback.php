<?php
$Md5key = "4f66xxxxxae579616a2";   //密钥
header("Content-Type: text/html; charset=UTF-8");
$obj = file_get_contents('php://input');
 

//测试时，将来源请求写入到txt文件，方便分析查看
file_put_contents("callback_log.txt", $obj );

$obj=json_decode($obj,TRUE);

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

//验证签名是否一致,一致后开始处理上分
if ($sign!= $signUP) exit('error:sign');
 
//最后返回成功标识
echo 'OK';

