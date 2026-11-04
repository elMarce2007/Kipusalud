package com.kipusalud.security;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

public final class RolePermissions {

    public static final String DASHBOARD_VIEW = "DASHBOARD:VER";
    public static final String CLIENTES_VIEW = "CLIENTES:VER";
    public static final String CLIENTES_MANAGE = "CLIENTES:GESTIONAR";
    public static final String CATALOGO_VIEW = "CATALOGO:VER";
    public static final String CATALOGO_MANAGE = "CATALOGO:GESTIONAR";
    public static final String INVENTARIO_VIEW = "INVENTARIO:VER";
    public static final String INVENTARIO_MANAGE = "INVENTARIO:GESTIONAR";
    public static final String VENTAS_VIEW = "VENTAS:VER";
    public static final String VENTAS_MANAGE = "VENTAS:GESTIONAR";
    public static final String PERSONAL_VIEW = "PERSONAL:VER";
    public static final String PERSONAL_MANAGE = "PERSONAL:GESTIONAR";
    public static final String USUARIOS_VIEW = "USUARIOS:VER";
    public static final String USUARIOS_MANAGE = "USUARIOS:GESTIONAR";
    public static final String FARMACIA_VIEW = "FARMACIA:VER";
    public static final String FARMACIA_EDIT = "FARMACIA:EDITAR";

    private static final Set<String> ALL = Set.of(
            DASHBOARD_VIEW,
            CLIENTES_VIEW, CLIENTES_MANAGE,
            CATALOGO_VIEW, CATALOGO_MANAGE,
            INVENTARIO_VIEW, INVENTARIO_MANAGE,
            VENTAS_VIEW, VENTAS_MANAGE,
            PERSONAL_VIEW, PERSONAL_MANAGE,
            USUARIOS_VIEW, USUARIOS_MANAGE,
            FARMACIA_VIEW, FARMACIA_EDIT
    );

    private static final Set<String> QF_BASE = Set.of(
            DASHBOARD_VIEW,
            CLIENTES_VIEW, CLIENTES_MANAGE,
            CATALOGO_VIEW, CATALOGO_MANAGE,
            INVENTARIO_VIEW, INVENTARIO_MANAGE,
            VENTAS_VIEW, VENTAS_MANAGE,
            PERSONAL_VIEW, PERSONAL_MANAGE,
            FARMACIA_VIEW
    );

    private RolePermissions() {}

    public static Set<String> forRole(String role) {
        return switch (role) {
            case "ADMINISTRADOR" -> ALL;
            case "GERENTE_SUPERVISOR" -> Set.of(
                    DASHBOARD_VIEW,
                    CLIENTES_VIEW, CLIENTES_MANAGE,
                    CATALOGO_VIEW, CATALOGO_MANAGE,
                    INVENTARIO_VIEW, INVENTARIO_MANAGE,
                    VENTAS_VIEW, VENTAS_MANAGE,
                    PERSONAL_VIEW, PERSONAL_MANAGE,
                    FARMACIA_VIEW
            );
            case "QF_REGENTE" -> QF_BASE;
            case "EMPLEADO" -> Set.of(
                    DASHBOARD_VIEW,
                    CLIENTES_VIEW, CLIENTES_MANAGE,
                    CATALOGO_VIEW, CATALOGO_MANAGE,
                    INVENTARIO_VIEW, INVENTARIO_MANAGE,
                    VENTAS_VIEW, VENTAS_MANAGE,
                    FARMACIA_VIEW
            );
            default -> Set.of();
        };
    }

    public static Set<String> effectivePermissions(String role, Collection<String> additional) {
        Set<String> permissions = new HashSet<>(forRole(role));
        if ("GERENTE_SUPERVISOR".equals(role) && additional != null) {
            for (String permission : additional) {
                if (permission != null && isManagerDelegation(permission)) {
                    permissions.add(permission);
                }
            }
        }
        if (permissions.contains(USUARIOS_MANAGE)) {
            permissions.add(USUARIOS_VIEW);
        }
        return Set.copyOf(permissions);
    }

    public static boolean isManagerDelegation(String permission) {
        return FARMACIA_EDIT.equals(permission) || USUARIOS_MANAGE.equals(permission);
    }

    public static boolean isKnown(String permission) {
        return ALL.contains(permission);
    }
}
