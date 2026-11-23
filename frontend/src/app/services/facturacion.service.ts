import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MENSAJES_POR_ESTADO, SILENCIAR_404 } from '../core/interceptors/error.interceptor';
import {
  ComprobanteElectronico,
  CredencialesSunatRequest,
  OpcionesComprobante,
  PerfilFiscalRequest,
  SunatConfiguracion
} from '../models/facturacion.model';

@Injectable({ providedIn: 'root' })
export class FacturacionService {
  private http = inject(HttpClient);
  private readonly ventasUrl = `${environment.apiUrl}/ventas`;
  private readonly silencioso = { context: new HttpContext().set(SILENCIAR_404, true) };

  private conMensajes(mensajes: Partial<Record<number, string>>) {
    return { context: new HttpContext().set(MENSAJES_POR_ESTADO, mensajes) };
  }

  private static readonly SUNAT_NO_DISPONIBLE =
    'SUNAT no respondió correctamente. El comprobante queda pendiente: consulta su estado más tarde.';

  /** 404 significa que la farmacia todavía no registró su configuración. */
  obtenerConfiguracion(): Observable<SunatConfiguracion> {
    return this.http.get<SunatConfiguracion>(
      `${this.ventasUrl}/facturacion/configuracion`, this.silencioso);
  }

  guardarPerfil(request: PerfilFiscalRequest): Observable<SunatConfiguracion> {
    return this.http.put<SunatConfiguracion>(`${this.ventasUrl}/facturacion/configuracion`, request,
      this.conMensajes({
        400: 'Revisa los datos: RUC de 11 dígitos, ubigeo de 6, serie de facturas F### y de boletas B###.'
      }));
  }

  guardarCredenciales(request: CredencialesSunatRequest): Observable<SunatConfiguracion> {
    return this.http.put<SunatConfiguracion>(
      `${this.ventasUrl}/facturacion/configuracion/credenciales`, request,
      this.conMensajes({
        400: 'Revisa las credenciales: usuario y clave SOL, y un certificado .pfx/.p12 válido con su '
          + 'contraseña correcta y su clave privada.',
        412: 'Guarda primero los datos fiscales de la farmacia.'
      }));
  }

  /** Comprobantes disponibles para el punto de venta (cualquier usuario de ventas). */
  obtenerOpciones(): Observable<OpcionesComprobante> {
    return this.http.get<OpcionesComprobante>(`${this.ventasUrl}/facturacion/opciones`);
  }

  /** 404 significa que la venta aún no tiene comprobante electrónico. */
  obtenerFactura(ventaId: number): Observable<ComprobanteElectronico> {
    return this.http.get<ComprobanteElectronico>(
      `${this.ventasUrl}/${ventaId}/factura-electronica`, this.silencioso);
  }

  emitirFactura(ventaId: number): Observable<ComprobanteElectronico> {
    return this.http.post<ComprobanteElectronico>(`${this.ventasUrl}/${ventaId}/factura-electronica`, {},
      this.conMensajes({
        400: 'No se puede facturar: el cliente necesita RUC, razón social y dirección fiscal, y todos '
          + 'los productos deben tener configurada su afectación IGV.',
        409: 'No se puede emitir ahora: la venta no está confirmada, se registró con boleta interna o hay '
          + 'un envío anterior sin resultado. En ese caso usa «Consultar estado en SUNAT».',
        412: 'La farmacia no tiene habilitada la emisión electrónica. El administrador la configura en '
          + 'Administración → Datos fiscales y SUNAT.',
        502: FacturacionService.SUNAT_NO_DISPONIBLE
      }));
  }

  consultarEnSunat(ventaId: number): Observable<ComprobanteElectronico> {
    return this.http.post<ComprobanteElectronico>(
      `${this.ventasUrl}/${ventaId}/factura-electronica/consultar-sunat`, {},
      this.conMensajes({
        404: 'Esta venta no tiene un comprobante registrado.',
        412: 'No hay configuración SUNAT para consultar el comprobante.',
        502: FacturacionService.SUNAT_NO_DISPONIBLE
      }));
  }

  descargarCdr(ventaId: number): Observable<Blob> {
    return this.http.get(`${this.ventasUrl}/${ventaId}/factura-electronica/cdr`, {
      responseType: 'blob',
      ...this.conMensajes({ 404: 'Este comprobante aún no tiene una constancia (CDR) descargable.' })
    });
  }
}
