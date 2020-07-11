var express = require('express');
var braintree = require("braintree");
var bodyParser = require('body-parser');

// Enter your credentials
const gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: '',
    publicKey: '',
    privateKey: ''
});


var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var CLIENT_TOKEN = '';
gateway.clientToken.generate({}, function (err, response) {
    if (err) {
        console.log('ERROR_CLIENT_TOKEN', err);
    }
    console.log('CLIENT_TOKEN', response.clientToken);
    CLIENT_TOKEN = response.clientToken;
});

app.post("/checkout", function (req, res) {
    console.log(req.body);
    if (Object.keys(req.body).length) {
        const requestBody = {
            amount: '10.00',
            paymentMethodNonce: req.body.payment_method_nonce,
            orderId: "Mapped to PayPal Invoice Number - Random " + (Math.random() * 10).toFixed(2),
            options: {
                submitForSettlement: true,
                paypal: {
                    customField: "PayPal custom field",
                    description: "Description for PayPal email receipt",
                },
            }
        };

        gateway.transaction.sale(requestBody, function (err, result) {
            if (err) {
                console.log('ERROR_SALE_CREATION', err);
                res.status(500).json({
                    error: err
                });
            } else if (result.success) {
                console.log('SALE_CREATION_SUCCESSFUL', result);
                res.status(201).json({
                    result
                });
            } else {
                console.log('SALE_CREATION_UNSUCCESSFUL', result, result.message);
                res.status(500).json({
                    result
                });
            }
        });
    } else {
        res.status(400).json({
            error: 'Invalid request: missing payment_method_nonce'
        });
    }
});

app.get('/', function (req, res) {
    res.send(`
    <!DOCTYPE html>

<head>
    <meta charset="utf-8">
    <title>Mano The Tech Guy</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script>
        CLIENT_TOKEN = '${CLIENT_TOKEN}';
    </script>
    <script src="https://js.braintreegateway.com/web/dropin/1.22.1/js/dropin.min.js"></script>
    <!-- Load Device data collector -->
    <script src="https://js.braintreegateway.com/web/3.62.2/js/data-collector.min.js"></script>

    <!-- Load PayPal's checkout.js Library. -->
    <script src="https://www.paypalobjects.com/api/checkout.js" data-version-4 log-level="warn"></script>
    <!-- Load the client component. -->
    <script src="https://js.braintreegateway.com/web/3.62.2/js/client.min.js"></script>
    <!-- Load the PayPal Checkout component. -->
    <script src="https://js.braintreegateway.com/web/3.62.2/js/paypal-checkout.min.js"></script>
</head>

<body>
    <div id="paypal-button"></div>
    <script>
        var button = document.querySelector('#submit-button');
        // Create a client.
        braintree.client.create({
            authorization: '${CLIENT_TOKEN}'
        }).then(function (clientInstance) {
            // Create a PayPal Checkout component.
            return braintree.paypalCheckout.create({
                client: clientInstance,
                paypal: true
            });
        }).then(function (paypalCheckoutInstance) {
            // Set up PayPal with the checkout.js library
            return paypal.Button.render({
                env: 'sandbox',
                commit: true, // or 'sandbox'

                payment: function () {
                    return paypalCheckoutInstance.createPayment({
                        flow: 'checkout', // Required
                        amount: 10.00, // Required
                        currency: 'USD', // Required
                        enableShippingAddress: true,
                        shippingAddressEditable: false,
                        shippingAddressOverride: {
                            recipientName: 'Scruff McGruff',
                            line1: '1234 Main St.',
                            line2: 'Unit 1',
                            city: 'Chicago',
                            countryCode: 'US',
                            postalCode: '60652',
                            state: 'IL',
                            phone: '123.456.7890'
                        }
                    });
                },

                onAuthorize: function (data, actions) {
                    return paypalCheckoutInstance.tokenizePayment(data)
                        .then(function (payload) {
                            console.log(payload);
                            axios.post('/checkout', {
                                payment_method_nonce: payload.nonce
                            }, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Access-Control-Allow-Origin': '*'
                                }, 
                            })
                                .then(function (response) {
                                    console.log(response);
                                })
                                .catch(function (error) {
                                    console.log(error);
                                });
                        });
                },

                onCancel: function (data) {
                    console.log('checkout.js payment cancelled', JSON.stringify(data, 0, 2));
                },

                onError: function (err) {
                    console.error('checkout.js error', err);
                }
            }, '#paypal-button');
        }).then(function (response) {
            console.log(response, 'Ready to use pp');
        }).catch(function (err) {
            // Handle component creation error
        });
    </script>
</body>

</html>
    `);
});

app.listen(3000, () => {
    console.log('Server listening at 3000');
});