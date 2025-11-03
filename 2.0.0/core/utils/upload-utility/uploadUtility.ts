// middleware/uploadMiddleware.ts
import { Context } from "./utils/context.ts";
import { handleFileUpload } from "./upload.ts";

export const parseProjectFormData = async (
  ctx: Context,
  next: () => Promise<unknown>,
) => {
  const body = await ctx.request.body({ type: "form-data" });
  const formData = await body.value.read({ maxSize: 10_000_000 });

  const nativeForm = new FormData();

  for (const [key, value] of Object.entries(formData.fields)) {
    nativeForm.append(key, value);
  }

  for (const file of formData.files || []) {
    if (file.content && file.originalName) {
      const blob = new Blob([file.content], { type: file.contentType });
      const fileObj = new File([blob], file.originalName, {
        type: file.contentType,
      });
      nativeForm.append(file.name, fileObj);
    }
  }

  const uploaded = await handleFileUpload(nativeForm);
  if (uploaded.length > 0) {
    formData.fields.image = uploaded[0];
  }

  // Store the final fields in ctx.state
  ctx.state.formData = formData.fields;

  await next();
};
