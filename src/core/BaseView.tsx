import React from "react";

export abstract class BaseView<P = {}, S = {}> extends React.Component<P, S> {
  // Base views can have shared properties or methods if needed in the future
  // For now it serves as the base for all views in the application
}
