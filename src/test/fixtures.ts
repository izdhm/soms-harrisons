import type { MetaResponse, OrdersListResponse, SalesOrder } from '../api/types'

export function makeOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
  return {
    SalesId: 'SO-MOCK-00001',
    SalesName: 'Siti Mart Sdn Bhd',
    CustAccount: 'C10001',
    InventSiteId: 'B20',
    DOT_ItemGroupId: 'FG-HOME',
    SalesGroup: 'SG-NORTH',
    SalesStatus: 'Open order',
    DocumentStatus: 'Confirmed',
    DOT_ValidationStatus: 'Validated',
    DOT_ShowOrderStatus: 'Open order',
    ShippingDateRequested: '2026-10-01',
    CreatedDateTime1: '2026-09-30T03:07:00.000Z',
    ModifiedDateTime1: '2026-09-30T03:07:00.000Z',
    HAR_TotalSOAmount: 162.35,
    HAR_InvoicedAmount: 0,
    HAR_BalanceAmount: 162.35,
    SalesTaker: 'Aisha Noor',
    CustomerRef: 'PO-2026001',
    SalesDistrictDescription: 'Lahad Datu',
    SalesType: 'Return',
    DOT_SONotes: null,
    DOT_SFANotes: null,
    PurchOrderFormNum: 'POF-1',
    ReleaseStatus: 'Open',
    MCROrderStopped: 'No',
    HAR_SalesDeliveryDistrictId: 'DD-B20',
    HAR_DeliveryDistrictDescription: 'Sandakan',
    ...overrides,
  }
}

export function makeList(data: SalesOrder[], overrides: Partial<OrdersListResponse> = {}): OrdersListResponse {
  return {
    summary: {
      total_orders: 1200,
      filtered_orders: data.length,
      open_orders: 420,
      invoiced_orders: 360,
      delivered_orders: 300,
      cancelled_orders: 120,
      total_order_value: 998244.3,
    },
    page: 1,
    pageSize: 25,
    total: data.length,
    totalPages: Math.max(1, Math.ceil(data.length / 25)),
    sort: 'CreatedDateTime1',
    order: 'desc',
    data,
    ...overrides,
  }
}

export const META: MetaResponse = {
  name: 'HSSB assessment mock sales-orders API',
  version: '1.1.0',
  facets: {
    statuses: [
      { value: 'Cancelled', count: 120 },
      { value: 'Delivered', count: 300 },
      { value: 'Invoiced', count: 360 },
      { value: 'Open order', count: 420 },
    ],
    sites: [
      { value: 'A10', count: 150 },
      { value: 'B20', count: 150 },
    ],
  },
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
