import Script from 'next/script';

// Carga el widget de Netlify Identity sólo si la URL trae un token de recovery/confirmation/invite
// (`#invite_token=`, `#recovery_token=`, `#confirmation_token=`), redirige a /admin/ y
// se desregistra. Mantiene al mínimo el JS en páginas públicas.
export function IdentityRedirect() {
  return (
    <>
      <Script src="https://identity.netlify.com/v1/netlify-identity-widget.js" strategy="afterInteractive" />
      <Script id="nude-identity-redirect" strategy="afterInteractive">
        {`(function(){
          var hash = window.location.hash || '';
          var tokens = /#(invite_token|recovery_token|confirmation_token)=/;
          if (!tokens.test(hash)) return;
          if (window.location.pathname.startsWith('/admin/')) return;
          window.location.replace('/admin/' + hash);
        })();`}
      </Script>
    </>
  );
}
