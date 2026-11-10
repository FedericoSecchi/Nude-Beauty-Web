import Script from 'next/script';
import { ContactoWhatsapp } from './ContactoWhatsapp';

// El init (dataLayer + gtag + config) va como <script> común en el HTML: corre al parsear la página,
// antes de que React hidrate. Con next/script afterInteractive llegaba después de los useEffect de la
// ficha y del carrito, y view_item / view_cart se perdían (window.gtag todavía no existía).
// gtag.js en sí sigue cargando después, sin bloquear: procesa la cola del dataLayer en orden.
export function GA4() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  return (
    <>
      <script
        id="ga4-init"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js', new Date());gtag('config', ${JSON.stringify(id)}, { send_page_view: true });`,
        }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
        strategy="afterInteractive"
      />
      <ContactoWhatsapp />
    </>
  );
}
