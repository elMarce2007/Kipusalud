package com.kipusalud.security;

import java.util.Set;

/** Permite fijar el tenant en pruebas unitarias sin pasar por el filtro JWT. */
public final class TenantTestSupport {

    private TenantTestSupport() {}

    public static void usar(Long farmaciaId, String rol) {
        TenantContext.set(new TenantContext.Identity("usuario-prueba", farmaciaId, rol, Set.of()));
        TenantContext.setAuthorization("Bearer token-de-prueba");
    }

    public static void limpiar() {
        TenantContext.clear();
    }
}
