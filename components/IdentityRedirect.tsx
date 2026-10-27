import Script from 'next/script';

// Las páginas públicas no cargan el widget de Netlify Identity: solo lo carga /admin/ (public/admin/index.html).
// Si un mail de invitación / recuperación / confirmación cae en otra página (`#invite_token=`,
// `#recovery_token=`, `#confirmation_token=`), este script mínimo lo manda a /admin/ con el token,
// y ahí el widget lo procesa.
export function IdentityRedirect() {
  return (
    <Script id="nude-identity-redirect" strategy="afterInteractive">
      {`(function(){
        var hash = window.location.hash || '';
        if (!/^#(invite_token|recovery_token|confirmation_token)=/.test(hash)) return;
        if (window.location.pathname.indexOf('/admin/') === 0) return;
        window.location.replace('/admin/' + hash);
      })();`}
    </Script>
  );
}
