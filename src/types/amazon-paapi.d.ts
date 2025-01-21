declare module 'amazon-paapi' {
  function SearchItems(commonParameters: any, requestParameters: any): Promise<any>;
  function GetItems(commonParameters: any, requestParameters: any): Promise<any>;
  function GetVariations(commonParameters: any, requestParameters: any): Promise<any>;
  export default { SearchItems, GetItems, GetVariations };
} 