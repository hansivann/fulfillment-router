import {authenticate} from "../shopify.server";
import db from '../db.server';

export const action = async ({request}) => {
  const {payload, session, topic, shop} = await authenticate.webhook(request);

  const shopifyOrderId = payload.id;
  const firstName = payload.customer.first_name;
  const lastName = payload.customer.last_name;
  const customerName = `${firstName} ${lastName}`;
  const customerEmail = payload.customer.email;
  const lineItems = payload.line_items;

  const vendors = Object.groupBy(lineItems, (lineItem) => {
    return lineItem.vendor;
  })

  const groupByVendor = lineItems.reduce(
    (accumulator, lineItem) => {
      const key = lineItem.vendor;

      if(!accumulator[key]) {
        accumulator[key]= [];
      }

      accumulator[key].push(lineItem);

      return accumulator;
    }, {})

    console.log(`Received ${topic} webhook for ${shop}`);

    if(session) {
      await db.order.create({
        data: {
          shopifyOrderId,
          customerName,
          customerEmail,
          shop,
    }})

      Object.keys(groupByVendor).map((vendor) => {
        const lineItems = groupByVendor[vendor];


        lineItems.map((lineItem) => {
          db.lineItem.create({
            data: {
              shopifyLineItemId: lineItem.id,
              title: lineItem.title,
              quantity: lineItem.quantity,
              price: lineItem.price,
              vendor,
              order: {
                connect: {
                  shopifyOrderId
                }
              }
            }
          })
        })
      }})
    }


}
