package com.kipusalud.security;

public final class TenantContext {

    private static final ThreadLocal<Identity> IDENTITY = new ThreadLocal<>();
    private static final ThreadLocal<String> AUTHORIZATION = new ThreadLocal<>();

    private TenantContext() {}

    static void set(Identity identity) {
        IDENTITY.set(identity);
    }

    static void clear() {
        IDENTITY.remove();
        AUTHORIZATION.remove();
    }

    static void setAuthorization(String authorization) {
        AUTHORIZATION.set(authorization);
    }

    public static String requireAuthorization() {
        String authorization = AUTHORIZATION.get();
        if (authorization == null) {
            throw new IllegalStateException("No hay credenciales para la solicitud autenticada");
        }
        return authorization;
    }

    public static Identity requireIdentity() {
        Identity identity = IDENTITY.get();
        if (identity == null) {
            throw new IllegalStateException("No hay una identidad autenticada en la solicitud");
        }
        return identity;
    }

    public static Long requireFarmaciaId() {
        return requireIdentity().farmaciaId();
    }

    public static String requireUsername() {
        return requireIdentity().username();
    }

    public static String requireRole() {
        return requireIdentity().role();
    }

    public record Identity(String username, Long farmaciaId, String role) {}
}
