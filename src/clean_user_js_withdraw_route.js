import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

const regexClean = /router\.post\('\/withdraw', async \(req, res\) => \{[\s\S]*?\n\}\);/;

const cleanWithdrawRoute = `router.post('/withdraw', async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, method, wallet_address, bank_name, account_number, account_name, password } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    const settings = await prisma.settings.findFirst();
    const minWithdrawal = Number(settings?.min_withdrawal || 50);
    const feeRate = Number(settings?.withdrawal_fee_rate || 0.15);

    if (Number(amount) < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: \`Minimum withdrawal amount is R\${minWithdrawal}\`
      });
    }

    if (settings && settings.withdrawal_open_time && settings.withdrawal_close_time) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [openH, openM] = settings.withdrawal_open_time.split(':').map(Number);
      const [closeH, closeM] = settings.withdrawal_close_time.split(':').map(Number);

      const openMinutes = openH * 60 + (openM || 0);
      const closeMinutes = closeH * 60 + (closeM || 0);

      if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
        const openTime = settings.withdrawal_open_time;
        const closeTime = settings.withdrawal_close_time;
        return res.status(400).json({
          success: false,
          message: \`Withdrawals are currently closed. Withdrawal operating hours are between \${openTime} and \${closeTime}.\`
        });
      }
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userInvestmentsCount = await prisma.investments.count({
      where: { user_id: userId }
    });

    if (userInvestmentsCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal locked. You must activate an investment package before you can withdraw.'
      });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Withdrawal password is required to confirm withdrawal' });
    }

    let isPasswordValid = false;
    if (user.withdrawal_pin) {
      isPasswordValid = await safeBcryptCompare(password, user.withdrawal_pin);
    }
    if (!isPasswordValid && user.password) {
      isPasswordValid = await safeBcryptCompare(password, user.password);
    }

    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Incorrect withdrawal password' });
    }

    const withdrawableBal = Number(user.withdrawable_balance || 0);

    if (withdrawableBal < Number(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient withdrawable balance' });
    }

    const fees = Number(amount) * feeRate;
    const netAmount = Number(amount) - fees;

    let destAddress = wallet_address;
    let withdrawMethod = method;

    if (method === 'USDT' || wallet_address?.startsWith('T') || wallet_address?.startsWith('0x')) {
      destAddress = wallet_address || user.usdt_address || 'USDT Wallet';
      withdrawMethod = \`USDT (\${user.usdt_network || 'TRC20'})\`;
    } else {
      const bName = bank_name || user.bank_name || 'Bank';
      const bAcc = account_number || user.bank_account_number || '';
      const bNameHolder = account_name || user.bank_account_name || '';
      destAddress = wallet_address || \`\${bName}: \${bAcc} (\${bNameHolder})\`;
      withdrawMethod = method || \`Bank Transfer (\${bName})\`;
    }

    // Create PENDING withdrawal request WITHOUT touching user balance or Cumulative Income.
    // Balance will be deducted ONLY ONCE when Admin approves the withdrawal.
    const withdrawalResult = await prisma.withdrawals.create({
      data: {
        user_id: userId,
        amount: Number(amount),
        withdrawal_method: withdrawMethod,
        fees: fees,
        net_amount: netAmount,
        wallet_address: destAddress,
        status: 'PENDING'
      }
    });

    await logActivity(userId, 'withdrawal requested', req, { amount, fees, net_amount: netAmount, destination: destAddress });

    return res.json({
      success: true,
      message: 'Withdrawal request submitted successfully. Awaiting approval.',
      withdrawal: withdrawalResult
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process withdrawal request' });
  }
});`;

userContent = userContent.replace(regexClean, cleanWithdrawRoute);
fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Cleaned user.js withdraw route perfectly!');
