package com.kipusalud.clienteservice.service;

import com.kipusalud.clienteservice.dto.ClienteDto;
import com.kipusalud.clienteservice.entity.Cliente;
import com.kipusalud.clienteservice.repository.ClienteRepository;
import com.kipusalud.security.TenantContext;
import org.springframework.stereotype.Service;
import com.kipusalud.clienteservice.socket.SocketNotificationServer;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClienteServiceImpl implements ClienteService {

    private final ClienteRepository clienteRepository;
    private final SocketNotificationServer socketNotificationServer;

    public ClienteServiceImpl(
            ClienteRepository clienteRepository,
            SocketNotificationServer socketNotificationServer
    ) {
        this.clienteRepository = clienteRepository;
        this.socketNotificationServer = socketNotificationServer;
    }

    @Override
    public List<ClienteDto> listar() {
        return clienteRepository.findAllByFarmaciaIdOrderByApellidosAscNombresAsc(
                TenantContext.requireFarmaciaId()).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public ClienteDto obtener(Long id) {
        return toDto(clienteRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado: " + id)));
    }

    @Override
    public ClienteDto crear(ClienteDto dto) {

        Cliente cliente = toEntity(dto);
        cliente.setFarmaciaId(TenantContext.requireFarmaciaId());
        Cliente clienteGuardado = clienteRepository.save(cliente);

        socketNotificationServer.notificar(
                "Nuevo cliente registrado: "
                        + clienteGuardado.getNombres()
        );

        return toDto(clienteGuardado);
    }

    @Override
    public ClienteDto actualizar(Long id, ClienteDto dto) {
        Cliente cliente = clienteRepository.findByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado: " + id));
        cliente.setNombres(dto.nombres());
        cliente.setApellidos(dto.apellidos());
        cliente.setDni(dto.dni());
        cliente.setTelefono(dto.telefono());
        cliente.setEmail(dto.email());
        cliente.setRuc(dto.ruc());
        cliente.setRazonSocial(dto.razonSocial());
        cliente.setDireccionFiscal(dto.direccionFiscal());
        Cliente clienteActualizado =
                clienteRepository.save(cliente);

        socketNotificationServer.notificar(
                "Cliente actualizado: "
                        + clienteActualizado.getNombres()
        );

        return toDto(clienteActualizado);
    }

    @Override
    public void eliminar(Long id) {

        socketNotificationServer.notificar(
                "Cliente eliminado con ID: " + id
        );

        clienteRepository.deleteByIdAndFarmaciaId(id, TenantContext.requireFarmaciaId());
    }

    private ClienteDto toDto(Cliente c) {
        return new ClienteDto(c.getId(), c.getNombres(), c.getApellidos(), c.getDni(), c.getTelefono(),
                c.getEmail(), c.getRuc(), c.getRazonSocial(), c.getDireccionFiscal());
    }

    private Cliente toEntity(ClienteDto dto) {
        Cliente c = new Cliente();
        c.setNombres(dto.nombres());
        c.setApellidos(dto.apellidos());
        c.setDni(dto.dni());
        c.setTelefono(dto.telefono());
        c.setEmail(dto.email());
        c.setRuc(dto.ruc());
        c.setRazonSocial(dto.razonSocial());
        c.setDireccionFiscal(dto.direccionFiscal());
        return c;
    }
}
