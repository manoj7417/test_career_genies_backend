const { User } = require('../models/userModel');

const checkAndResetExpiredCredits = async (user) => {
    const currentDate = new Date();
    let needsUpdate = false;
    let resetReason = [];

    // Check if trial has expired
    if (user.subscription?.trialExpiryDate && user.subscription.trialExpiryDate < currentDate) {
        if (user.subscription.planType === 'trial' && (
            user.subscription.analyserTokens?.credits > 0 ||
            user.subscription.optimizerTokens?.credits > 0 ||
            user.subscription.JobCVTokens?.credits > 0 ||
            user.subscription.careerCounsellingTokens?.credits > 0 ||
            user.subscription.downloadCVTokens?.credits > 0 ||
            user.subscription.cvScanTokens?.credits > 0
        )) {
            user.subscription.analyserTokens.credits = 0;
            user.subscription.optimizerTokens.credits = 0;
            user.subscription.JobCVTokens.credits = 0;
            user.subscription.careerCounsellingTokens.credits = 0;
            user.subscription.downloadCVTokens.credits = 0;
            user.subscription.cvScanTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('trial expired');
        }
    }

    // Check if coupon has expired
    if (user.subscription?.couponExpiryDate && user.subscription.couponExpiryDate < currentDate) {
        if (user.subscription.planType === 'coupon' && (
            user.subscription.analyserTokens?.credits > 0 ||
            user.subscription.optimizerTokens?.credits > 0 ||
            user.subscription.JobCVTokens?.credits > 0 ||
            user.subscription.careerCounsellingTokens?.credits > 0 ||
            user.subscription.downloadCVTokens?.credits > 0 ||
            user.subscription.cvScanTokens?.credits > 0
        )) {
            user.subscription.analyserTokens.credits = 0;
            user.subscription.optimizerTokens.credits = 0;
            user.subscription.JobCVTokens.credits = 0;
            user.subscription.careerCounsellingTokens.credits = 0;
            user.subscription.downloadCVTokens.credits = 0;
            user.subscription.cvScanTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('coupon expired');
        }
    }

    // Check if discounted plan has expired (using currentPeriodEnd for discounted plans)
    if (user.subscription?.planType === 'discounted' && user.subscription?.currentPeriodEnd && user.subscription.currentPeriodEnd < currentDate) {
        if (user.subscription.analyserTokens?.credits > 0 ||
            user.subscription.optimizerTokens?.credits > 0 ||
            user.subscription.JobCVTokens?.credits > 0 ||
            user.subscription.careerCounsellingTokens?.credits > 0 ||
            user.subscription.downloadCVTokens?.credits > 0 ||
            user.subscription.cvScanTokens?.credits > 0
        ) {
            user.subscription.analyserTokens.credits = 0;
            user.subscription.optimizerTokens.credits = 0;
            user.subscription.JobCVTokens.credits = 0;
            user.subscription.careerCounsellingTokens.credits = 0;
            user.subscription.downloadCVTokens.credits = 0;
            user.subscription.cvScanTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('discounted plan expired');
        }
    }

    // Check individual token expiry dates (for regular paid plans)
    if (user.subscription?.analyserTokens?.expiry && user.subscription.analyserTokens.expiry < currentDate) {
        if (user.subscription.analyserTokens.credits > 0) {
            user.subscription.analyserTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('analyser tokens expired');
        }
    }

    if (user.subscription?.optimizerTokens?.expiry && user.subscription.optimizerTokens.expiry < currentDate) {
        if (user.subscription.optimizerTokens.credits > 0) {
            user.subscription.optimizerTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('optimizer tokens expired');
        }
    }

    if (user.subscription?.JobCVTokens?.expiry && user.subscription.JobCVTokens.expiry < currentDate) {
        if (user.subscription.JobCVTokens.credits > 0) {
            user.subscription.JobCVTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('JobCV tokens expired');
        }
    }

    if (user.subscription?.careerCounsellingTokens?.expiry && user.subscription.careerCounsellingTokens.expiry < currentDate) {
        if (user.subscription.careerCounsellingTokens.credits > 0) {
            user.subscription.careerCounsellingTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('career counselling tokens expired');
        }
    }

    if (user.subscription?.downloadCVTokens?.expiry && user.subscription.downloadCVTokens.expiry < currentDate) {
        if (user.subscription.downloadCVTokens.credits > 0) {
            user.subscription.downloadCVTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('download CV tokens expired');
        }
    }

    if (user.subscription?.cvScanTokens?.expiry && user.subscription.cvScanTokens.expiry < currentDate) {
        if (user.subscription.cvScanTokens.credits > 0) {
            user.subscription.cvScanTokens.credits = 0;
            needsUpdate = true;
            resetReason.push('CV scan tokens expired');
        }
    }

    // Save user if any credits were reset
    if (needsUpdate) {
        await user.save();
        console.log(`Expired credits reset for user ${user._id}: ${resetReason.join(', ')}`);
    }

    return user;
};

// Function to reset expired credits for all users in the database
const resetAllExpiredCredits = async () => {
    try {
        const currentDate = new Date();
        console.log('Starting batch reset of expired credits...');

        // Find all users with subscriptions
        const users = await User.find({
            'subscription': { $exists: true }
        });

        let updatedUsersCount = 0;

        for (const user of users) {
            let needsUpdate = false;
            let resetCreditsInfo = [];

            // Check if trial has expired
            if (user.subscription?.trialExpiryDate && user.subscription.trialExpiryDate < currentDate) {
                if (user.subscription.planType === 'trial' && (
                    user.subscription.analyserTokens?.credits > 0 ||
                    user.subscription.optimizerTokens?.credits > 0 ||
                    user.subscription.JobCVTokens?.credits > 0 ||
                    user.subscription.careerCounsellingTokens?.credits > 0 ||
                    user.subscription.downloadCVTokens?.credits > 0 ||
                    user.subscription.cvScanTokens?.credits > 0
                )) {
                    user.subscription.analyserTokens.credits = 0;
                    user.subscription.optimizerTokens.credits = 0;
                    user.subscription.JobCVTokens.credits = 0;
                    user.subscription.careerCounsellingTokens.credits = 0;
                    user.subscription.downloadCVTokens.credits = 0;
                    user.subscription.cvScanTokens.credits = 0;
                    needsUpdate = true;
                    resetCreditsInfo.push('trial expired');
                }
            }

            // Check if coupon has expired
            if (user.subscription?.couponExpiryDate && user.subscription.couponExpiryDate < currentDate) {
                if (user.subscription.planType === 'coupon' && (
                    user.subscription.analyserTokens?.credits > 0 ||
                    user.subscription.optimizerTokens?.credits > 0 ||
                    user.subscription.JobCVTokens?.credits > 0 ||
                    user.subscription.careerCounsellingTokens?.credits > 0 ||
                    user.subscription.downloadCVTokens?.credits > 0 ||
                    user.subscription.cvScanTokens?.credits > 0
                )) {
                    user.subscription.analyserTokens.credits = 0;
                    user.subscription.optimizerTokens.credits = 0;
                    user.subscription.JobCVTokens.credits = 0;
                    user.subscription.careerCounsellingTokens.credits = 0;
                    user.subscription.downloadCVTokens.credits = 0;
                    user.subscription.cvScanTokens.credits = 0;
                    needsUpdate = true;
                    resetCreditsInfo.push('coupon expired');
                }
            }

            // Check if discounted plan has expired
            if (user.subscription?.planType === 'discounted' && user.subscription?.currentPeriodEnd && user.subscription.currentPeriodEnd < currentDate) {
                if (user.subscription.analyserTokens?.credits > 0 ||
                    user.subscription.optimizerTokens?.credits > 0 ||
                    user.subscription.JobCVTokens?.credits > 0 ||
                    user.subscription.careerCounsellingTokens?.credits > 0 ||
                    user.subscription.downloadCVTokens?.credits > 0
                ) {
                    user.subscription.analyserTokens.credits = 0;
                    user.subscription.optimizerTokens.credits = 0;
                    user.subscription.JobCVTokens.credits = 0;
                    user.subscription.careerCounsellingTokens.credits = 0;
                    user.subscription.downloadCVTokens.credits = 0;
                    needsUpdate = true;
                    resetCreditsInfo.push('discounted plan expired');
                }
            }

            // Check individual token expiry dates (for regular paid plans)
            if (user.subscription?.analyserTokens?.expiry &&
                user.subscription.analyserTokens.expiry < currentDate &&
                user.subscription.analyserTokens.credits > 0) {
                user.subscription.analyserTokens.credits = 0;
                needsUpdate = true;
                resetCreditsInfo.push('analyser tokens expired');
            }

            if (user.subscription?.optimizerTokens?.expiry &&
                user.subscription.optimizerTokens.expiry < currentDate &&
                user.subscription.optimizerTokens.credits > 0) {
                user.subscription.optimizerTokens.credits = 0;
                needsUpdate = true;
                resetCreditsInfo.push('optimizer tokens expired');
            }

            if (user.subscription?.JobCVTokens?.expiry &&
                user.subscription.JobCVTokens.expiry < currentDate &&
                user.subscription.JobCVTokens.credits > 0) {
                user.subscription.JobCVTokens.credits = 0;
                needsUpdate = true;
                resetCreditsInfo.push('JobCV tokens expired');
            }

            if (user.subscription?.careerCounsellingTokens?.expiry &&
                user.subscription.careerCounsellingTokens.expiry < currentDate &&
                user.subscription.careerCounsellingTokens.credits > 0) {
                user.subscription.careerCounsellingTokens.credits = 0;
                needsUpdate = true;
                resetCreditsInfo.push('career counselling tokens expired');
            }

            if (user.subscription?.downloadCVTokens?.expiry &&
                user.subscription.downloadCVTokens.expiry < currentDate &&
                user.subscription.downloadCVTokens.credits > 0) {
                user.subscription.downloadCVTokens.credits = 0;
                needsUpdate = true;
                resetCreditsInfo.push('download CV tokens expired');
            }

            if (user.subscription?.cvScanTokens?.expiry &&
                user.subscription.cvScanTokens.expiry < currentDate &&
                user.subscription.cvScanTokens.credits > 0) {
                user.subscription.cvScanTokens.credits = 0;
                needsUpdate = true;
                resetCreditsInfo.push('CV scan tokens expired');
            }

            // Save user if any credits were reset
            if (needsUpdate) {
                await user.save();
                updatedUsersCount++;
                console.log(`Reset expired credits for user ${user._id}: ${resetCreditsInfo.join(', ')}`);
            }
        }

        console.log(`Batch reset completed. Updated ${updatedUsersCount} users.`);
        return { success: true, updatedUsers: updatedUsersCount };
    } catch (error) {
        console.error('Error during batch reset of expired credits:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    checkAndResetExpiredCredits,
    resetAllExpiredCredits
}; 