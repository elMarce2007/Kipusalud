import { FormControl, FormGroup } from '@angular/forms';
import { datosFiscalesCompletos } from './cliente-form.component';

function grupo(ruc: string, razonSocial: string, direccionFiscal: string) {
  return new FormGroup({
    ruc: new FormControl(ruc),
    razonSocial: new FormControl(razonSocial),
    direccionFiscal: new FormControl(direccionFiscal)
  });
}

describe('datosFiscalesCompletos', () => {
  it('acepta un cliente sin datos fiscales', () => {
    expect(datosFiscalesCompletos(grupo('', '', ''))).toBeNull();
  });

  it('acepta los tres datos fiscales completos', () => {
    expect(datosFiscalesCompletos(grupo('20123456789', 'Clínica SAC', 'Av. Perú 123'))).toBeNull();
  });

  it('rechaza datos fiscales parciales', () => {
    expect(datosFiscalesCompletos(grupo('20123456789', '', ''))).toEqual({ datosFiscalesIncompletos: true });
    expect(datosFiscalesCompletos(grupo('', 'Clínica SAC', '   '))).toEqual({ datosFiscalesIncompletos: true });
  });
});
