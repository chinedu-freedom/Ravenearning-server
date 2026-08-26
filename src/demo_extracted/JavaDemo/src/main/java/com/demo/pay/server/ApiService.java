package com.demo.pay.server;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.validation.constraints.DecimalMin;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.BasicResponseHandler;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.alibaba.fastjson.JSONObject;

/**
 * Created by dayupai on 2018/4/16.
 */
@Service
public class ApiService {
	protected static final Logger logger = LoggerFactory.getLogger(ApiService.class);

	String platMerId = "后台的商户号";// 商户号
	String MER_KEY = "后台的密钥";// 密钥

	String pay_url = "http://localhost:8080/api/pay/createPay";// 支付地址
	String pay_query_url = "http://localhost:8080/api/pay/queryPay";// 支付订单查询地址
	String df_url = "http://localhost:8080/api/pay/createDraw";// 代付地址
	String df_query_url = "http://localhost:8080/api/pay/queryDraw";// 代付订单查询地址
	String balance_url = "http://localhost:8080/api/pay/queryBalance";// 余额查询地址
	static String QSTRING_EQUAL = "=";
	static String QSTRING_SPLIT = "&";

	/**
	 * 支付交易
	 *
	 * @return
	 * @throws Exception
	 */
	public String cardPay() throws Exception {

		JSONObject businessContext = new JSONObject();

		// 必传验签参数
		businessContext.put("payMemberId", platMerId);// 商户号 平台分配商户号
		businessContext.put("payOrderId", String.valueOf(System.currentTimeMillis()));// 订单号
		businessContext.put("payApplyDate", getNowTime());// 提交时间 时间格式：2016-12-26 18:18:18
		businessContext.put("payChannelCode", "8001");// 通道编码
		businessContext.put("payNotifyUrl", "http://localhost:8888/asynchronous");// 服务端通知 服务端返回地址.（POST返回数据）
		businessContext.put("payAmount", "10000.00");// 订单金额 商品金额
		businessContext.put("sign", buildMd5Signature(businessContext, true, false, MER_KEY));// MD5签名请看MD5签名字段格式

		// 可选参数
//		businessContext.put("payCallbackUrl", "http://baidu.com/id=111");// 商户前端页面支付成功后跳转通知地址

		String jsonResult = HttpPostWithJson(pay_url, businessContext.toString());
		// {"msg":"操作成功","code":200,"data":{"status":"success","platformOrderId":"20251743251582284","payOrderId":"1743251580916","payMemberId":"4f66e9f47d7b4bd7b098a5ae579616a2","payAmount":"100.00","tradeState":"NOTPAY","msg":"待支付","payUrl":"\"https://pay96.quickpay.lol\"]/pay?token=dc1f040d87814a5e961a78c8c1075da6edeab1a5f93a41d99f8b3ed4aefd4359","sign":"8D57FFFD0B82CFD5920F5E8487209D00","bank":{"cardNo":"2017004320","cardName":"MR
		// EF KARIEM","bankName":"Capitec Business","reference":"749na8b6"}}}
		logger.error("[Post后结果jsonResult] : {}", jsonResult);
		if (jsonResult == null) {
			return "支付请求异常";
		}

		// 验签
		JSONObject object = JSONObject.parseObject(jsonResult);
		JSONObject data = object.getJSONObject("data");
		String signUp = data.getString("sign");
		if (StringUtils.isEmpty(signUp)) {
			return "验签失败";
		}
		data.remove("bank");
		data.remove("sign");
		String signCheck = buildMd5Signature(data, true, false, MER_KEY);
		if (!signUp.equals(signCheck)) {
			return "验签失败";
		}
		// tradeState:
		// SUCCESS已支付，NOTPAY未支付，REFUND订单取消，REVOKE订单撤销，FREEZED已冻结，PAYERROR支付失败
		if (data.getString("status").equals("success")) {
			return "交易成功： " + data.getString("payUrl");

		} else {
			return "支付失败： " + object.getString("msg");
		}

	}

	/**
	 * 支付异步回调
	 */
	public void asynchronous(HttpServletRequest requests, HttpServletResponse response) throws Exception {
		String backMsg = "OK";
		BufferedReader streamReader = new BufferedReader(new InputStreamReader(requests.getInputStream(), "UTF-8"));
		StringBuilder responseStrBuilder = new StringBuilder();
		String inputStr;
		while ((inputStr = streamReader.readLine()) != null)
			responseStrBuilder.append(inputStr);
		String param = responseStrBuilder.toString();

		System.out.println("收到支付返回的异步回调，参数：" + param);

		JSONObject object = JSONObject.parseObject(param);
		JSONObject data = object.getJSONObject("data");

		logger.error("[Post后结果jsonResult] : {}", object);

		// 验签
		String signUp = null;
		if (backMsg.equals("OK")) {
			signUp = data.getString("sign");
			if (StringUtils.isEmpty(signUp)) {
				backMsg = "验签失败";
			}
		}
		if (backMsg.equals("OK")) {
			data.remove("sign");
			String signCheck = buildMd5Signature(data, true, false, MER_KEY);
			if (!signUp.equals(signCheck)) {
				backMsg = "验签失败";
			}
		}
		if (backMsg.equals("OK")) {
			// tradeState:
			// SUCCESS已支付，NOTPAY未支付，REFUND订单取消，REVOKE订单撤销，FREEZED已冻结，PAYERROR支付失败
			if (data.getString("tradeState").equals("SUCCESS")) {
				// TODO:判断交易状态

			}
		}

		response.setCharacterEncoding("UTF-8");
		response.setContentType("application/json;charset=UTF8");
		PrintWriter writer = response.getWriter();
		writer.write(backMsg);
		writer.close();

	}

	/**
	 * 支付订单 查询
	 *
	 * @return
	 * @throws Exception
	 */
	public String query() throws Exception {

		JSONObject businessContext = new JSONObject();

		businessContext.put("payMemberId", platMerId);// 商户号 平台分配商户号
		businessContext.put("payOrderId", "1753948693222");// 订单编号
		businessContext.put("sign", buildMd5Signature(businessContext, true, false, MER_KEY));

		String jsonResult = HttpPostWithJson(pay_query_url, businessContext.toString());
		logger.error("[Post后结果jsonResult] : {}", jsonResult);
		if (jsonResult == null) {
			return "支付请求异常";
		}

		// 验签
		JSONObject object = JSONObject.parseObject(jsonResult);
		JSONObject data = object.getJSONObject("data");

		String signUp = data.getString("sign");
		if (StringUtils.isEmpty(signUp)) {
			return "验签失败";
		}
		data.remove("sign");
		String signCheck = buildMd5Signature(data, true, false, MER_KEY);
		if (!signUp.equals(signCheck)) {
			return "验签失败";
		}
		// tradeState:
		// SUCCESS已支付，NOTPAY未支付，REFUND订单取消，REVOKE订单撤销，FREEZED已冻结，PAYERROR支付失败
		if (data.getString("tradeState").equals("SUCCESS")) {
			// TODO:判断交易状态

		}
		return "查询成功";
	}

	/**
	 * 代付交易
	 *
	 * @return
	 * @throws Exception
	 */
	public String cardDraw() throws Exception {

		JSONObject businessContext = new JSONObject();
		businessContext.put("drawMemberId", platMerId);// 商户号
		businessContext.put("drawOrderId", String.valueOf(System.currentTimeMillis()));// 订单号
		businessContext.put("drawAmount", "100.00");// 金额 单位：元
		businessContext.put("drawPayNow", 1); //跨行是否立即支付 0：否 1：是
		businessContext.put("drawBankName", "Nedbank"); // 开户行名称 参考《代付支持银行》，严格对应支持的银行编码。
		businessContext.put("drawCardNumber", "13888888888");// 银行卡号
		businessContext.put("drawAccountName", "张三");// 银行卡户名
		businessContext.put("drawNotifyUrl", "http://localhost:8888/dfasynchronous");// 异步通知回调URL地址

		businessContext.put("sign", buildMd5Signature(businessContext, true, false, MER_KEY));

		String jsonResult = HttpPostWithJson(df_url, businessContext.toString());
		logger.error("[Post后结果jsonResult] : {}", jsonResult);
		if (jsonResult == null) {
			return "支付请求异常";
		}

		// 验签
		JSONObject object = JSONObject.parseObject(jsonResult);
		JSONObject data = object.getJSONObject("data");

		String signUp = data.getString("sign");
		if (StringUtils.isEmpty(signUp)) {
			return "验签失败";
		}
		data.remove("sign");
		String signCheck = buildMd5Signature(data, true, false, MER_KEY);
		if (!signUp.equals(signCheck)) {
			return "验签失败";
		}

		// tradeState:
		// SUCCESS已支付，NOTPAY未支付，REFUND订单取消，REVOKE订单撤销，FREEZED已冻结，PAYERROR支付失败
		if (data.getString("status").equals("success")) {
			return "交易成功： " + data.getString("msg");

		} else {
			return "支付失败： " + data.getString("msg");
		}

	}

	/**
	 * 代付异步回调
	 */
	public void dfasynchronous(HttpServletRequest requests, HttpServletResponse response) throws Exception {
		String backMsg = "OK";
		BufferedReader streamReader = new BufferedReader(new InputStreamReader(requests.getInputStream(), "UTF-8"));
		StringBuilder responseStrBuilder = new StringBuilder();
		String inputStr;
		while ((inputStr = streamReader.readLine()) != null)
			responseStrBuilder.append(inputStr);
		String param = responseStrBuilder.toString();

		System.out.println("收到代付返回的异步回调，参数：" + param);

		JSONObject object = JSONObject.parseObject(param);
		JSONObject data = object.getJSONObject("data");

		logger.error("[Post后结果jsonResult] : {}", object);

		// 验签
		String signUp = null;
		if (backMsg.equals("OK")) {
			signUp = data.getString("sign");
			if (StringUtils.isEmpty(signUp)) {
				backMsg = "验签失败";
			}
		}
		if (backMsg.equals("OK")) {
			data.remove("sign");
			String signCheck = buildMd5Signature(data, true, false, MER_KEY);
			if (!signUp.equals(signCheck)) {
				backMsg = "验签失败";
			}
		}
		if (backMsg.equals("OK")) {
			// tradeState:
			// SUCCESS已支付，NOTPAY未支付，REFUND订单取消，REVOKE订单撤销，FREEZED已冻结，PAYERROR支付失败
			if (data.getString("tradeState").equals("SUCCESS")) {
				// TODO:判断交易状态

			}
		}

		response.setCharacterEncoding("UTF-8");
		response.setContentType("application/json;charset=UTF8");
		PrintWriter writer = response.getWriter();
		writer.write(backMsg);
		writer.close();

	}

	/**
	 * 代付订单 查询
	 *
	 * @return
	 * @throws Exception
	 */
	public String dfQuery() throws Exception {

		JSONObject businessContext = new JSONObject();

		businessContext.put("drawMemberId", platMerId);// 商户号 平台分配商户号
		businessContext.put("drawOrderId", "1753949953706");// 订单编号
		businessContext.put("sign", buildMd5Signature(businessContext, true, false, MER_KEY));

		String jsonResult = HttpPostWithJson(df_query_url, businessContext.toString());
		logger.error("[Post后结果jsonResult] : {}", jsonResult);
		if (jsonResult == null) {
			return "支付请求异常";
		}

		// 验签
		JSONObject object = JSONObject.parseObject(jsonResult);
		JSONObject data = object.getJSONObject("data");

		String signUp = data.getString("sign");
		if (StringUtils.isEmpty(signUp)) {
			return "验签失败";
		}
		data.remove("sign");
		String signCheck = buildMd5Signature(data, true, false, MER_KEY);
		if (!signUp.equals(signCheck)) {
			return "验签失败";
		}
		// tradeState:
		// SUCCESS已支付，NOTPAY未支付，REFUND订单取消，REVOKE订单撤销，FREEZED已冻结，PAYERROR支付失败
		if (data.getString("tradeState").equals("SUCCESS")) {
			// TODO:判断交易状态

		}

		return "查询成功";
	}

	/**
	 * 余额查询
	 */
	@ResponseBody
	public void balance() throws Exception {
		JSONObject businessContext = new JSONObject();
		businessContext.put("memberId", platMerId);// 商户号
		businessContext.put("applyDate", getNowTime());// 订单号
		businessContext.put("sign", buildMd5Signature(businessContext, true, false, MER_KEY));
		String jsonResult = HttpPostWithJson(balance_url, businessContext.toString());
		logger.error("[Post后结果jsonResult] : {}", jsonResult);
	}

	/**
	 * 获取当前日期，格式为：如：2016-09-26 16:14:55
	 * 
	 * @return 日期字符串
	 */
	public static String getNowTime() {
		Date newdate = new Date();
		SimpleDateFormat sf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		String dateformat = sf.format(newdate);
		return dateformat;
	}

	/**
	 * 把请求要素按照“参数=参数值”的模式用“&”字符拼接成字符串
	 * 
	 * @param para   请求要素
	 * @param sort   是否需要根据key值作升序排列
	 * @param encode 是否需要URL编码
	 * @return 拼接成的字符串
	 */
	public static String buildMd5Signature(Map<String, Object> para, boolean sort, boolean encode, String md5Key) {

		List<String> keys = new ArrayList<String>(para.keySet());

		if (sort)
			Collections.sort(keys);

		StringBuilder sb = new StringBuilder();

		// 空值不参与签名
		for (int i = 0; i < keys.size(); i++) {
			String key = keys.get(i);
			Object value = para.get(key);
			// 空值不参与签名
			if (value == null || value.equals("null") || value.equals("NULL") || value.toString().length() == 0 || key.equals("sign")) {
				keys.remove(i);
				i--;
				continue;
			}
		}

		for (int i = 0; i < keys.size(); i++) {
			String key = keys.get(i);
			Object value = para.get(key);
			if (encode) {
				try {
					value = URLEncoder.encode(value.toString(), "UTF-8");
				} catch (UnsupportedEncodingException e) {
				}
			}

			if (i == keys.size() - 1) {// 拼接时，不包括最后一个&字符
				sb.append(key).append(QSTRING_EQUAL).append(value);
			} else {
				sb.append(key).append(QSTRING_EQUAL).append(value).append(QSTRING_SPLIT);
			}
		}

		sb.append(QSTRING_SPLIT).append("key").append(QSTRING_EQUAL).append(md5Key);
		System.out.println("---------------------收到MyMd5Util加密请求---------------------");
		System.out.println("Md5Sign=" + sb.toString());
		System.out.println("---------------------------------------------------------------");
		String sign = null;

		try {
			sign = md5(sb.toString()).toUpperCase();
		} catch (NoSuchAlgorithmException e) {
			e.printStackTrace();
		}
		return sign;
	}

	/**
	 * 
	 * MD5加密
	 * 
	 * @param str
	 * @return
	 * @throws NoSuchAlgorithmException
	 */

	public static String md5(String str) throws NoSuchAlgorithmException {
		try {
			MessageDigest md = MessageDigest.getInstance("MD5");
			md.update(str.getBytes());
			byte[] byteDigest = md.digest();
			int i;
			// 字符数组转换成字符串
			StringBuffer buf = new StringBuffer("");
			for (int offset = 0; offset < byteDigest.length; offset++) {
				i = byteDigest[offset];
				if (i < 0)
					i += 256;
				if (i < 16)
					buf.append("0");
				buf.append(Integer.toHexString(i));
			}
			// 32位加密
			return buf.toString().toUpperCase();
		} catch (NoSuchAlgorithmException e) {
			e.printStackTrace();
			return null;
		}
	}

	public static String HttpPostWithJson(String url, String json) {
		String returnValue = null;
		CloseableHttpClient httpClient = HttpClients.createDefault();
		ResponseHandler<String> responseHandler = new BasicResponseHandler();
		try {
			// 第一步：创建HttpClient对象
			httpClient = HttpClients.createDefault();

			// 第二步：创建httpPost对象
			HttpPost httpPost = new HttpPost(url);

			// 第三步：给httpPost设置JSON格式的参数
			StringEntity requestEntity = new StringEntity(json, "UTF-8");
			// requestEntity.setContentEncoding("UTF-8");
			httpPost.setHeader("Content-type", "application/json");
			httpPost.setEntity(requestEntity);

			// 第四步：发送HttpPost请求，获取返回值
			returnValue = httpClient.execute(httpPost, responseHandler); // 调接口获取返回值时，必须用此方法

		} catch (Exception e) {
			e.printStackTrace();
		}

		finally {
			try {
				httpClient.close();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		// 第五步：处理返回值
		return returnValue;
	}

	public static void main(String[] args) throws Exception {
		ApiService apiService = new ApiService();

//		 代收交易
//		String resultPay = apiService.cardPay();
//		System.out.println(resultPay);

// 		代收交易查询
//		String resultQuery = apiService.query();
//		System.out.println(resultQuery);

// 		代付交易
//		String	resultPay = apiService.cardDraw();
//		System.out.println(resultPay);

// 		代付交易查询
//		String resultQuery = apiService.dfQuery();
//		System.out.println(resultQuery);

//		 余额查询
		apiService.balance();

	}

}
