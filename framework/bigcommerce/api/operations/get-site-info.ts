import type { GetSiteInfoQuery, GetSiteInfoQueryVariables } from '../../schema'
import type { RecursivePartial, RecursiveRequired } from '../utils/types'
import filterEdges from '../utils/filter-edges'
import { BigcommerceConfig, getConfig } from '..'
import { categoryTreeItemFragment } from '../fragments/category-tree'
import { fetchSteedosGraphqlApi } from '../utils/fetch-steedos-api'
import { convertBrandTreeType, convertCategoryTreeType } from './type-convert'

// Get 3 levels of categories
export const getSiteInfoQuery = /* GraphQL */ `
  query getSiteInfo {
    site {
      categoryTree {
        ...categoryTreeItem
        children {
          ...categoryTreeItem
          children {
            ...categoryTreeItem
          }
        }
      }
      brands {
        pageInfo {
          startCursor
          endCursor
        }
        edges {
          cursor
          node {
            entityId
            name
            defaultImage {
              urlOriginal
              altText
            }
            pageTitle
            metaDesc
            metaKeywords
            searchKeywords
            path
          }
        }
      }
    }
  }
  ${categoryTreeItemFragment}
`

export type CategoriesTree = NonNullable<
  GetSiteInfoQuery['site']['categoryTree']
>

export type BrandEdge = NonNullable<
  NonNullable<GetSiteInfoQuery['site']['brands']['edges']>[0]
>

export type Brands = BrandEdge[]

export type GetSiteInfoResult<
  T extends { categories: any[]; brands: any[] } = {
    categories: CategoriesTree
    brands: Brands
  }
> = T

async function getSiteInfo(opts?: {
  variables?: GetSiteInfoQueryVariables
  config?: BigcommerceConfig
  preview?: boolean
}): Promise<GetSiteInfoResult>

async function getSiteInfo<
  T extends { categories: any[]; brands: any[] },
  V = any
>(opts: {
  query: string
  variables?: V
  config?: BigcommerceConfig
  preview?: boolean
}): Promise<GetSiteInfoResult<T>>

async function getSiteInfo({
  query = getSiteInfoQuery,
  variables,
  config,
}: {
  query?: string
  variables?: GetSiteInfoQueryVariables
  config?: BigcommerceConfig
  preview?: boolean
} = {}): Promise<GetSiteInfoResult> {
  config = getConfig(config)
  // RecursivePartial forces the method to check for every prop in the data, which is
  // required in case there's a custom `query`
  const { data } = await config.fetch<RecursivePartial<GetSiteInfoQuery>>(
    query,
    { variables }
  )
  const categories = data.site?.categoryTree
  const brands = data.site?.brands?.edges
  // console.log('categories----', categories)
  // console.log('brands----', brands)
  //调用steedos的fetch，通过graphql获取数据
  const proQuery = `
    query{
      cc_category__c {
        _id
        name
      }
    }
  `
  const siteInfos  = await fetchSteedosGraphqlApi(proQuery)
  const categoryTree = convertCategoryTreeType(siteInfos.data)
  //console.log('categoryTree---', categoryTree)
  //const brandTree = convertBrandTreeType(siteInfos.data)

  return {
    categories: (categoryTree as RecursiveRequired<typeof categories>) ?? [],
    brands: filterEdges(brands as RecursiveRequired<typeof brands>),
  }
}

export default getSiteInfo
