package com.demo.pay.controllers;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.alibaba.fastjson.JSONObject;
import com.demo.pay.server.ApiService;

@Controller
public class IndexController {

	@Autowired
	private ApiService apiService;

	@RequestMapping("/")
	String index() {
		return "orderPage";
	}

	/**
	 * 支付交易
	 *
	 * @return
	 * @throws Exception
	 */
	@ResponseBody
	@RequestMapping(value = "/pay", method = RequestMethod.GET)
	public String pay(HttpServletRequest requests, Model model) throws Exception {
		return apiService.cardPay();
	}

	/**
	 * 支付异步回调
	 */
	@ResponseBody
	@RequestMapping(value = "/asynchronous", method = RequestMethod.POST)
	public void asynchronous(HttpServletRequest requests, HttpServletResponse response) throws Exception {
		apiService.asynchronous(requests, response);
	}

	/**
	 * 支付订单 查询
	 *
	 * @return
	 * @throws Exception
	 */
	@ResponseBody
	@RequestMapping(value = "/query", method = RequestMethod.GET)
	public String query(HttpServletRequest request) throws Exception {
		return apiService.query();
	}

	/**
	 * 代付交易
	 *
	 * @return
	 * @throws Exception
	 */
	@ResponseBody
	@RequestMapping(value = "/daifu", method = RequestMethod.GET)
	public String daifu() throws Exception {
		return apiService.cardDraw();
	}

	/**
	 * 代付异步回调
	 */
	@ResponseBody
	@RequestMapping(value = "/dfasynchronous", method = RequestMethod.POST)
	public void dfasynchronous(HttpServletRequest requests, HttpServletResponse response) throws Exception {
		apiService.dfasynchronous(requests, response);
	}
	
	/**
	 * 代付订单 查询
	 *
	 * @return
	 * @throws Exception
	 */
	@ResponseBody
	@RequestMapping(value = "/dfQuery", method = RequestMethod.GET)
	public String dfQuery(HttpServletRequest requests) throws Exception {
		return apiService.dfQuery();
	}
	
	/**
	 * 余额查询
	 */
	@ResponseBody
	@RequestMapping(value = "/balance", method = RequestMethod.POST)
	public void balance(HttpServletRequest requests, HttpServletResponse response) throws Exception {
		apiService.balance();
	}
	
	

}
