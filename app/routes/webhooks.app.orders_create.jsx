import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  const shopifyOrderId = String(payload.id);
  const firstName = payload.customer?.first_name || "";
  const lastName = payload.customer?.last_name || "";
  const customerName = `${firstName} ${lastName}`;
  const customerEmail = payload.customer?.email || "";
  const lineItems = payload.line_items;

  const groupByVendor = lineItems.reduce((accumulator, lineItem) => {
    const key = lineItem.vendor;
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(lineItem);
    return accumulator;
  }, {});

  console.log(`Received ${topic} webhook for ${shop}`);

  if (session) {
    // capture the created order so we have its id
    const order = await db.order.upsert({
      where: { shopifyOrderId},
      update: {},
      create: {
        shopifyOrderId,
        customerName,
        customerEmail,
        shop,
      },
    });

    // group line items by vendor then create fulfillment groups and line items in the DB.
    // use DB id, not shopifyOrderId to link fulfillment groups to the order
    for (const vendor of Object.keys(groupByVendor)) {
      const vendorItems = groupByVendor[vendor];

      // create fulfillment group first, capture id
      const fulfillmentGroup = await db.fulfillmentGroup.create({
        data: {
          orderId: order.id,
          vendor,
        },
      });

      //created each line item connected to the fulfillment group
      for (const lineItem of vendorItems) {
        await db.lineItem.create({
          data: {
            shopifyLineItemId: String(lineItem.id),
            title: lineItem.title,
            quantity: lineItem.quantity,
            price: String(lineItem.price),
            vendor,
            fulfillmentGroupId: fulfillmentGroup.id,
          },
        });
      }
    }
  }

  return new Response();
};
