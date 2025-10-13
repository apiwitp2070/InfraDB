export type CreateR2BucketBody = {
  bucketName?: string;
  accountId?: string;
  token?: string;
  enableDevDomain?: boolean;
};

export type CreateR2BucketResponse = {
  bucket: {
    name: string;
    location?: string;
    createdAt?: string;
  };
  devDomain: {
    bucketId: string;
    domain: string;
    enabled: boolean;
  };
};
