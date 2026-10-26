# Guía rápida — editar la tienda de NUDE

Hola Sole 💛. Esta guía es un paso a paso para que puedas cambiar precios, fotos, descripciones y zonas de envío de tu web **nudecosmetica.com**. No necesitás saber nada de código.

## 1. Entrar al panel

1. Entrá a **https://nudecosmetica.com/admin/**.
2. La primera vez vas a recibir un email de invitación de Netlify Identity: tocá el link del mail y creás tu contraseña.
3. En las próximas visitas, entrás con tu email y contraseña.

Si no te llega la invitación o se vence, avisale a Fede (Kosmos) y te mandamos una nueva.

## 2. Cambiar el precio de un producto

1. En el panel, tocá **Productos**.
2. Elegí el producto que querés editar.
3. Buscá el campo **Precio** y escribí el número nuevo (sin puntos ni símbolos: por ejemplo, `25300` para $25.300).
4. Arriba a la derecha, tocá **Publicar → Publicar ahora**.
5. En unos minutos (3 a 5), el precio nuevo aparece en la web. Si abriste la web antes, actualizá la página.

## 3. Cambiar o agregar una foto

1. En el producto, bajá hasta **Imágenes**.
2. Tocá **+ Agregar imagen** o la imagen que ya está para reemplazarla.
3. Subí la nueva foto (idealmente .jpg o .webp, 1024×1024 px más o menos).
4. **Publicar → Publicar ahora**.

Si querés poner varias fotos, se muestran en el orden en que las subís: la primera es la principal.

## 4. Pausar un producto (sin stock)

1. Abrí el producto.
2. Destildá la casilla **Disponible**.
3. **Publicar → Publicar ahora**.

En la web, el producto va a aparecer con **"Sin stock por ahora"** y un botón de WhatsApp. Cuando vuelva, volvé a tildar **Disponible**.

## 5. Cambiar un costo de envío

1. En el panel, tocá **Ajustes de la tienda → Zonas de envío**.
2. Tocá la zona que querés editar (Gran Córdoba, Resto de Córdoba, Resto del país).
3. Cambiá el **Costo** (número entero, por ejemplo `5000`) y, si querés, el **Modo**:
   - **fijo**: le aparece ese costo a quien compra.
   - **coordinar**: no muestra costo; se habla por WhatsApp.
4. **Publicar → Publicar ahora**.

## 6. Cambiar el 20% off por transferencia o el alias

1. **Ajustes de la tienda → Descuentos y pago**.
2. Para el 20%, cambiá **Descuento por transferencia** (`0.20` = 20%).
3. **Alias**, **CBU** y **Titular de la cuenta**: lo que ves ahí es lo que después aparece en la pantalla de "pedido" cuando alguien elige transferencia.
4. **Publicar → Publicar ahora**.

## 7. Agregar un producto nuevo

1. **Productos → + Nuevo producto**.
2. Completá los campos. Los importantes:
   - **Slug**: una palabra sin espacios ni acentos (por ejemplo `mascara-noche`). Es la URL del producto. **No la cambies después de publicar.**
   - **Nombre**, **Categoría** (face / body / sets / accesorios), **Precio**, **Disponible**.
   - **H1**, **Resumen**, **Modo de uso**, **Ingredientes**.
   - **FAQ**: podés agregar preguntas y respuestas.
3. **Publicar → Publicar ahora**.

## 8. ¿Dudas?

- Hay un error raro: avísanos y mandanos una captura.
- Perdiste la contraseña: podés pedir "Olvidé mi contraseña" en el login o avisarnos.
- Querés cambiar algo que no está en esta guía: pedinos ayuda; algunas cosas (texto legal, categorías nuevas, política de descuentos) se cambian desde el código.

Cariños 💛,
Kosmos.

---

**Nota técnica (para Fede)**: el panel usa Decap CMS v3 con `git-gateway` y Netlify Identity. Cada "Publicar" hace commit a `main` y Netlify redespliega automáticamente. Netlify Identity solo recibe parches de seguridad (en mantenimiento desde feb-2025); si falla el login, ver `seo/PLAN.md` §8.
