import {authenticate} from "../shopify.server"

export const action = async ({request}) => {
  const {payload, session, topic, shop} = await authenticate.webhook(request);

  const orderId = payload.id;
  const firstName = payload.customer.first_name;
  const lastName = payload.customer.last_name;
  const email = payload.customer.email;
  const lineItems = payload.line_items;

  const vendors = Object.groupBy(lineItems, (lineItem) => {
    return lineItem.vendor;
  })

  const groubByVendor = lineItems.reduce(
    (accumulator, lineItem) => {
      const key = lineItem.vendor;

      if(!accumulator[key]) {
        accumulator[key]= [];
      }

      accumulator[key].push(lineItem);

      return accumulator;
    }, {})
  }
