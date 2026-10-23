// Shapes returned by the mock sales order API (see GET /meta for the contract).

export interface SalesOrder {
  SalesId: string
  SalesName: string
  CustAccount: string
  InventSiteId: string
  DOT_ItemGroupId: string | null
  SalesGroup: string | null
  SalesStatus: string
  DocumentStatus: string | null
  DOT_ValidationStatus: string | null
  DOT_ShowOrderStatus: string | null
  ShippingDateRequested: string | null
  CreatedDateTime1: string
  ModifiedDateTime1: string | null
  HAR_TotalSOAmount: number
  HAR_InvoicedAmount: number | null
  HAR_BalanceAmount: number | null
  SalesTaker: string | null
  CustomerRef: string | null
  SalesDistrictDescription: string | null
  SalesType: string | null
  DOT_SONotes: string | null
  DOT_SFANotes: string | null
  PurchOrderFormNum: string | null
  ReleaseStatus: string | null
  MCROrderStopped: string | null
  HAR_SalesDeliveryDistrictId: string | null
  HAR_DeliveryDistrictDescription: string | null
}

export interface OrdersSummary {
  total_orders: number
  filtered_orders: number
  open_orders: number
  invoiced_orders: number
  delivered_orders: number
  cancelled_orders: number
  total_order_value: number
}

export interface OrdersListResponse {
  summary: OrdersSummary
  page: number
  pageSize: number
  total: number
  totalPages: number
  sort: string
  order: SortOrder
  data: SalesOrder[]
}

export interface OrderDetailResponse {
  data: SalesOrder
}

export interface Facet {
  value: string
  count: number
}

export interface MetaResponse {
  name: string
  version: string
  facets: {
    statuses: Facet[]
    sites: Facet[]
  }
}

export const SORT_FIELDS = [
  'SalesId',
  'CreatedDateTime1',
  'HAR_TotalSOAmount',
  'SalesStatus',
  'InventSiteId',
] as const

export type SortField = (typeof SORT_FIELDS)[number]
export type SortOrder = 'asc' | 'desc'

export interface OrderQuery {
  page: number
  pageSize: number
  q: string
  status: string
  site: string
  sort: SortField
  order: SortOrder
}
