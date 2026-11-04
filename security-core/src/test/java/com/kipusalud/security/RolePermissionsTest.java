package com.kipusalud.security;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RolePermissionsTest {

    @Test
    void qfAndEmployeeHaveDistinctAccessToUsersAndPersonnel() {
        Set<String> qf = RolePermissions.forRole("QF_REGENTE");
        Set<String> employee = RolePermissions.forRole("EMPLEADO");

        assertTrue(qf.contains(RolePermissions.PERSONAL_VIEW));
        assertFalse(qf.contains(RolePermissions.USUARIOS_VIEW));
        assertFalse(employee.contains(RolePermissions.PERSONAL_VIEW));
        assertFalse(employee.contains(RolePermissions.USUARIOS_VIEW));
        assertTrue(employee.contains(RolePermissions.VENTAS_MANAGE));
    }

    @Test
    void managerReceivesOnlyDelegatedOptionalPermissions() {
        Set<String> defaults = RolePermissions.effectivePermissions("GERENTE_SUPERVISOR", Set.of());
        Set<String> delegated = RolePermissions.effectivePermissions(
                "GERENTE_SUPERVISOR",
                Set.of(RolePermissions.FARMACIA_EDIT, RolePermissions.USUARIOS_MANAGE,
                        RolePermissions.CATALOGO_MANAGE));

        assertFalse(defaults.contains(RolePermissions.FARMACIA_EDIT));
        assertFalse(defaults.contains(RolePermissions.USUARIOS_VIEW));
        assertTrue(delegated.contains(RolePermissions.FARMACIA_EDIT));
        assertTrue(delegated.contains(RolePermissions.USUARIOS_VIEW));
        assertTrue(delegated.contains(RolePermissions.USUARIOS_MANAGE));

        Set<String> unsupportedDelegation = RolePermissions.effectivePermissions(
                "GERENTE_SUPERVISOR", Set.of(RolePermissions.USUARIOS_VIEW));
        assertFalse(unsupportedDelegation.contains(RolePermissions.USUARIOS_VIEW));
    }
}
