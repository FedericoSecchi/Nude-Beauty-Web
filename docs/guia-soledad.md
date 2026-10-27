# Guía rápida: cambiar cosas en la tienda de NUDE

Hola Sole 💛. Con esta guía podés cambiar precios, fotos, stock y costos de envío de **nudecosmetica.com** sin tocar nada técnico.

## Antes de empezar

- El panel está en **https://nudecosmetica.com/admin/**. Entrás con tu email (nudecosmeticaclean@gmail.com) y tu contraseña.
- Si no te acordás la contraseña, en la pantalla de ingreso tocá **«¿Olvidaste tu contraseña?»** y te llega un mail para crear una nueva.
- Cada vez que tocás **Publicar**, el cambio aparece en la web **en unos minutos** (entre 3 y 10). Si ya tenías la página abierta, actualizala.
- En cada producto vas a ver arriba lo que podés cambiar. Abajo de todo hay un grupo cerrado que dice **«Avanzado: no tocar (lo maneja Kosmos)»**: no hace falta abrirlo.
- Si algo es obligatorio y quedó vacío (por ejemplo el precio o las fotos), el panel te avisa («no ha rellenado un campo obligatorio») y no publica. Completalo y volvé a tocar **Publicar**.

## 1. Cambiar un precio

1. Tocá **Productos** y elegí el producto.
2. En **Precio**, escribí el número nuevo sin puntos ni signo $: para $25.300 escribí `25300`.
3. Tocá **Publicar** y después **Publicar ahora**.

## 2. Cambiar una foto

1. Tocá **Productos** y elegí el producto.
2. En **Fotos**, en la foto que querés cambiar tocá **Elige una imagen diferente** (o **Add foto** para sumar una nueva).
3. En la ventana de imágenes tocá **Subir nuevo**, elegí la foto de tu compu o celular y tocá **Confirmar selección**.
4. Si querés que una foto sea la principal, arrastrala (desde las dos rayitas) para que quede primera.
5. Tocá **Publicar** y después **Publicar ahora**.

Tiene que quedar al menos una foto. Mejor si es cuadrada y en .jpg o .webp.

## 3. Poner un producto sin stock

1. Tocá **Productos** y elegí el producto.
2. Apagá **¿Hay stock?** (queda en gris).
3. Tocá **Publicar** y después **Publicar ahora**.

En la web aparece «Sin stock» con un botón para escribirte por WhatsApp. Cuando vuelva a haber, prendé **¿Hay stock?** otra vez y publicá.

## 4. Cambiar un costo de envío

1. Tocá **Ajustes** y después **Costos de envío**.
2. Buscá la zona (por ejemplo «Gran Córdoba»).
3. En **Costo**, escribí el monto sin puntos (`4500`). Si lo dejás vacío o en 0, la web dice «a coordinar por WhatsApp».
4. Si querés, escribí el **Plazo de entrega** (por ejemplo «3 a 5 días hábiles»). Si lo dejás vacío, no se muestra plazo.
5. Tocá **Publicar** y después **Publicar ahora**.

## 5. Agregar un producto nuevo

1. Tocá **Productos** y después **＋ Producto**.
2. Completá **Nombre**, **Precio**, **¿Hay stock?** y al menos una foto (**Add foto** → **Elige una imagen** → **Subir nuevo** → **Confirmar selección**).
3. Completá **Tamaño** (si lo sabés), **Descripción corta**, **Ingredientes** y **Cómo se usa**.
4. Tocá **Publicar** y después **Publicar ahora**.
5. Avisale a Kosmos: le asignamos la categoría y completamos lo de Google (el grupo «Avanzado»).

La dirección del producto en la web se arma sola con el nombre. Si ya existe un producto con ese mismo nombre, el cambio no se publica: cambiale el nombre o escribinos.

## Alias, CBU y WhatsApp

En **Ajustes → Pagos y WhatsApp** están el **Alias**, el **Titular**, el **CBU** y el **WhatsApp** de la tienda. Lo que pongas ahí es lo que ve quien compra cuando elige transferencia. Revisalos bien antes de publicar.

### Mientras no haya alias: pedidos por WhatsApp

Si el **Alias** y el **CBU** están vacíos (y Mercado Pago no está conectado), la web vende igual, pero por WhatsApp: quien compra arma el carrito, completa nombre y teléfono, y toca **Enviar pedido por WhatsApp**. Te llega un mensaje al WhatsApp de la tienda con los productos, las cantidades, el precio de lista, el total con 20% off por transferencia, la entrega elegida y sus datos. Vos le respondés con los datos para pagar y coordinás el envío. Estos pedidos no quedan guardados en la web: el registro es tu chat.

El número al que llegan es el del campo **WhatsApp** de esta misma pantalla.

### Cómo cargar el alias (y pasar a cobrar por transferencia)

1. Entrá a **Ajustes → Pagos y WhatsApp**.
2. Escribí el **Alias** (por ejemplo `nude.cosmetica`) y el **Titular**. El **CBU** es opcional si ya pusiste el alias.
3. Tocá **Publicar** y después **Publicar ahora**.
4. En unos minutos la web cambia sola: el carrito deja de mandar el pedido por WhatsApp y vuelve a **Confirmar pedido**, y después de confirmar quien compra ve tu alias y el total para transferir. No hace falta pedirle nada a Kosmos.

Si borrás el alias y el CBU, la web vuelve sola a los pedidos por WhatsApp.

## ¿Algo no salió?

- Si después de 10 minutos el cambio no aparece en la web, escribinos con una captura de lo que cambiaste.
- Si querés cambiar algo que no está en esta guía (textos de la web, descuentos, categorías), pedínoslo.

Cariños 💛,
Kosmos.

---

**Nota técnica (para Fede)**: Decap CMS 3 en español (`locale: es`) con `git-gateway` y Netlify Identity (widget también en español). Cada «Publicar» hace commit a `main` y Netlify redeploya. El build valida el contenido (`lib/contenido.mjs` → `validarProductos`: precio entero > 0, al menos una foto, slug único): si algo está mal, el deploy falla y la web sigue como estaba. Los campos de «Avanzado» se guardan dentro de `avanzado` en cada JSON y el sitio los aplana al leer. Netlify Identity solo recibe parches de seguridad (en mantenimiento desde feb-2025); si falla el login, ver `seo/PLAN.md` §8.
