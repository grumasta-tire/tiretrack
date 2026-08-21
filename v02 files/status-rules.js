/* ===================================================================
   status-rules.js — Open/Closed is always derived, never set by hand.

   - Goods Receiving -> always "Closed" the moment it's recorded.
   - Warehouse Transfer delivery -> "Open" until a Goods Receiving row
     references it via linked_delivery_id.
   - Customer Delivery -> "Open" until POD is complete: receiver_name +
     receipt_date + pod_file_url are all present.
   - Goods Return -> always "Closed" the moment it's recorded.
=================================================================== */

const StatusRules = {
  receivingStatus() { return 'Closed'; },
  returnStatus() { return 'Closed'; },

  isPodComplete(delivery) {
    return !!(delivery.receiver_name && delivery.receiver_name.trim()
      && delivery.receipt_date && delivery.receipt_date.trim()
      && delivery.pod_file_url && delivery.pod_file_url.trim());
  },

  deliveryStatus(delivery, receivings) {
    if (delivery.delivery_type === 'Warehouse Transfer') {
      const received = (receivings || []).some(r => r.linked_delivery_id === delivery.id);
      return received ? 'Closed' : 'Open';
    }
    return this.isPodComplete(delivery) ? 'Closed' : 'Open';
  }
};
