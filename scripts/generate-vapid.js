const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('--- NUEVAS LLAVES VAPID GENERADAS ---');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_SUBJECT=mailto:tu-email@ejemplo.com');
console.log('--------------------------------------');
console.log('\nCopia estas líneas y pégalas en tus variables de entorno en Render.');
