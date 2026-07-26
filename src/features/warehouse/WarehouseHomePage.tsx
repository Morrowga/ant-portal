/**
 * Warehouse module's first real screen. Deliberately minimal -- this is
 * the starting point for building out Warehouse's actual features, not
 * a finished page. Confirms the module-picker/entering-screen/shell
 * architecture built for HR carries over correctly to a second module
 * with zero changes needed to that shared machinery.
 */
export function WarehouseHomePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Warehouse</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This module is just getting started -- more screens land here as
        Warehouse features get built out.
      </p>
    </div>
  );
}