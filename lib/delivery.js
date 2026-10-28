'use strict';
function calculateDeliveryFee(distanceKm, settings) {
 const distance = Number(distanceKm);
 if (!Number.isFinite(distance) || distance < 0) throw new Error('المسافة يجب أن تكون رقماً موجباً أو صفراً');
 let fee = distance * Math.max(0, Number(settings.price_per_km || 0));
 const min = Math.max(0, Number(settings.min_delivery_fee || 0));
 const max = Math.max(0, Number(settings.max_delivery_fee || 0));
 if (fee > 0 && fee < min) fee = min;
 if (max > 0 && fee > max) fee = max;
 return Math.round(fee);
}
module.exports = { calculateDeliveryFee };
