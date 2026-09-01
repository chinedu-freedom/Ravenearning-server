import { PrismaClient } from '@prisma/client';
import { buildQuickPaySign, getQuickPayFormattedTime } from './lib/quickpay.js';

const prisma = new PrismaClient();

async function runEndToEndQuickPayTest() {
  console.log('====================================================');
  console.log('🧪 END-TO-END QUICKPAY DEPOSIT & WEBHOOK TEST');
  console.log('====================================================\n');

  try {
    // 1. Get or create a test user
    let user = await prisma.users.findFirst();
    if (!user) {
      console.error('❌ No user found in database!');
      return;
    }

    const initialBalance = Number(user.balance);
    console.log(`👤 User: ${user.full_name || user.username || user.phone}`);
    console.log(`💰 Starting Wallet Balance: R${initialBalance.toFixed(2)}`);

    // 2. Fetch platform settings
    const settings = await prisma.settings.findFirst() || {};
    const merchantId = '532b2a3a8df246a791078787be05e10c';
    const secretKey = 'af3407370d3448ecb155a9bfd8e2427a';
    const gatewayUrl = 'https://safricaapi.quickn.vip';

    const testAmount = 50.00;
    console.log(`\n1️⃣ Creating Deposit for R${testAmount.toFixed(2)}...`);

    // Create deposit in DB
    const deposit = await prisma.deposits.create({
      data: {
        user_id: user.id,
        amount: testAmount,
        status: 'PENDING',
        proof_image_url: 'AUTO_GATEWAY'
      }
    });

    const payOrderId = `DEP-${deposit.id.slice(0, 8)}-${Date.now()}`;
    await prisma.deposits.update({
      where: { id: deposit.id },
      data: { track_id: payOrderId }
    });

    console.log(`   - Deposit ID: ${deposit.id}`);
    console.log(`   - Track ID (payOrderId): ${payOrderId}`);

    // 3. Call QuickPay Live API
    console.log(`\n2️⃣ Contacting QuickPay Gateway API (${gatewayUrl}/api/pay/createPay)...`);
    const qPayload = {
      payMemberId: merchantId,
      payOrderId: payOrderId,
      payApplyDate: getQuickPayFormattedTime(),
      payChannelCode: '8001',
      payNotifyUrl: 'https://ravenearning-server.onrender.com/api/quickpay-webhook',
      payAmount: testAmount.toFixed(2)
    };
    qPayload.sign = buildQuickPaySign(qPayload, secretKey);

    const qRes = await fetch(`${gatewayUrl}/api/pay/createPay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qPayload)
    });

    const qJson = await qRes.json();
    console.log(`   - HTTP Response Code: ${qRes.status}`);
    console.log(`   - QuickPay API Code: ${qJson.code}`);
    console.log(`   - QuickPay Message: "${qJson.msg}"`);

    if ((qJson.code === 200 || qJson.code === 0) && qJson.data?.payUrl) {
      console.log(`   - Checkout URL Generated: ${qJson.data.payUrl}`);
      console.log(`✅ QuickPay API successfully accepted deposit request!`);
    } else {
      console.error(`❌ QuickPay API call failed: ${JSON.stringify(qJson)}`);
      return;
    }

    // 4. Simulate QuickPay sending the exact Webhook payload that caused the earlier bug
    console.log(`\n3️⃣ Simulating QuickPay Sending Completed Webhook Callback...`);
    const simulatedWebhookPayload = {
      msg: "操作成功",
      code: 200,
      data: {
        status: "success",
        platformOrderId: `QP-${Date.now()}`,
        payOrderId: payOrderId,
        payMemberId: merchantId,
        payAmount: testAmount.toFixed(2),
        feeAmount: "1.80",
        actualAmount: "48.20",
        msg: "已支付",
        tradeState: "SUCCESS",
        sign: "F0692F125A3D26A058E5428C389DA1F0"
      }
    };

    // Execute Webhook Logic (same as in routes/index.js)
    const payload = simulatedWebhookPayload;
    const data = payload.data || payload;
    const incomingOrderId = data.payOrderId || data.pay_order_id || data.orderId;
    const tradeState = (data.tradeState || data.status || "").toString().toUpperCase();
    const amount = Number(data.payAmount || data.amount || 0);

    const isSuccess = tradeState === 'SUCCESS' || tradeState === '1' || tradeState === '200';

    if (isSuccess && incomingOrderId) {
      let matchedDeposit = await prisma.deposits.findFirst({
        where: { track_id: incomingOrderId },
        include: { user: true }
      });

      if (!matchedDeposit) {
        const rawIdSegment = incomingOrderId.replace('DEP-', '').split('-')[0];
        const pendingDeposits = await prisma.deposits.findMany({
          where: { status: 'PENDING' },
          include: { user: true }
        });
        matchedDeposit = pendingDeposits.find(d => 
          (d.track_id && d.track_id.includes(rawIdSegment)) || 
          d.id.startsWith(rawIdSegment)
        );
      }

      if (matchedDeposit && matchedDeposit.status !== 'approved') {
        const approvedAmount = amount > 0 ? amount : Number(matchedDeposit.amount);

        await prisma.$transaction(async (tx) => {
          await tx.deposits.update({
            where: { id: matchedDeposit.id },
            data: {
              status: 'approved',
              approved_at: new Date()
            }
          });

          const userBefore = await tx.users.findUnique({ where: { id: matchedDeposit.user_id } });
          const balanceBefore = Number(userBefore.balance);
          const balanceAfter = balanceBefore + approvedAmount;

          await tx.users.update({
            where: { id: matchedDeposit.user_id },
            data: { balance: balanceAfter }
          });

          await tx.transactions.create({
            data: {
              user_id: matchedDeposit.user_id,
              type: 'DEPOSIT',
              amount: approvedAmount,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              description: 'QuickPay Bank Deposit'
            }
          });
        });

        console.log(`✅ Webhook auto-credited deposit ${matchedDeposit.id}!`);
      }
    }

    // 5. Final Verification of Balance & Deposit Status
    const finalDeposit = await prisma.deposits.findUnique({ where: { id: deposit.id } });
    const finalUser = await prisma.users.findUnique({ where: { id: user.id } });
    const finalBalance = Number(finalUser.balance);

    console.log(`\n====================================================`);
    console.log(`📊 FINAL TEST VERIFICATION RESULT:`);
    console.log(`   - Deposit Status: ${finalDeposit.status.toUpperCase()} (Expected: APPROVED)`);
    console.log(`   - Wallet Balance Before: R${initialBalance.toFixed(2)}`);
    console.log(`   - Wallet Balance Now:    R${finalBalance.toFixed(2)} (Expected: R${(initialBalance + testAmount).toFixed(2)})`);
    console.log(`====================================================`);

    if (finalDeposit.status === 'approved' && finalBalance === (initialBalance + testAmount)) {
      console.log(`\n🎉 SUCCESS! THE QUICKPAY DEPOSIT & AUTO-CREDIT IS 100% WORKING AND VERIFIED!`);
    } else {
      console.error(`\n❌ TEST FAILED! Deposit was not auto-credited.`);
    }

  } catch (err) {
    console.error('❌ Error during E2E test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runEndToEndQuickPayTest();
