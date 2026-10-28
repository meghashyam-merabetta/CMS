# Category, subcategory and brand image uploads

The add/edit forms use file selection and drag-and-drop instead of asking for an image URL. Existing images are previewed. Replacement, removal and undo are supported; image changes are applied on Save. Closing a form without saving does not change its image.

Categories and subcategories use `PUT /api/admin/categories/:id/image`; brands use `PUT /api/admin/brands/:id/image`. Each request is FormData with exactly one `uploadimage` file. The browser sets the multipart boundary; the shared API client includes authentication cookies. Validated formats are JPG, PNG and WebP, at most 5 MiB per file. The backend validates actual file contents.

Metadata is saved via the existing JSON routes first. Returned IDs are kept as strings. If the subsequent image operation fails, the form and selected file remain available, and the error reports the saved ID. A retry skips unchanged metadata and retries the image operation without creating a second category/brand. Changed metadata is patched onto that saved ID before the image retry.

Successful upload previews use the returned `data.image_url`. Metadata-only saves omit the image URL key and preserve the existing image. Removals use DELETE on the image endpoint with JSON `{}`; the API client accepts empty 204 responses. A failed removal retains the committed image until a retry succeeds.

The shared service also exposes GET on the same route, accepting `data.image_url: null` when no image exists. Category detail/list fields remain `category_image`; brand fields remain `image_url`. Product image replacements now also display the returned immutable URL.

The supplied backend handoff reports these endpoints and durable storage cleanup implemented and tested locally with mocked S3. Confirm that the updated backend and migration `027-admin-catalog-reliability.sql` are deployed before testing on the hosted CMS. Authenticated hosted upload, replacement, removal and actual S3 access have not been verified from this workspace.

Automated checks cover multipart method/field/URL contracts, size and type validation, retrying partial saves, subcategory routing, deletion failures, and upload-control rendering. Run `npm test` and `npm run build -- --webpack`.
